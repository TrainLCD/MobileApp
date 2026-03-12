import { createHash } from 'node:crypto';
import { PubSub } from '@google-cloud/pubsub';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { GoogleAuth } from 'google-auth-library';
import { normalizeRomanText } from '../utils/normalize';

process.env.TZ = 'Asia/Tokyo';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const firestore = admin.firestore();
const storage = admin.storage();
const pubsub = new PubSub();
const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

const GEMINI_TTS_MODEL = 'gemini-2.5-flash-tts';
const GOOGLE_TTS_API_VERSION = 'v1';

interface SynthesizedAudio {
  audioContent: string;
  mimeType?: string;
}

const sniffAudioMimeType = (audioBuffer: Buffer): string => {
  // RIFF....WAVE
  if (
    audioBuffer.length >= 12 &&
    audioBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    audioBuffer.subarray(8, 12).toString('ascii') === 'WAVE'
  ) {
    return 'audio/wav';
  }

  // MP3 with ID3 header
  if (
    audioBuffer.length >= 3 &&
    audioBuffer.subarray(0, 3).toString('ascii') === 'ID3'
  ) {
    return 'audio/mpeg';
  }

  // MP3 frame sync (validate 4-byte header to avoid PCM false positives)
  if (
    audioBuffer.length >= 4 &&
    audioBuffer[0] === 0xff &&
    (audioBuffer[1] & 0xe0) === 0xe0 &&
    // version bits must not be 0x01 (reserved)
    ((audioBuffer[1] >> 3) & 0x03) !== 0x01 &&
    // layer bits must not be 0x00 (reserved)
    ((audioBuffer[1] >> 1) & 0x03) !== 0x00 &&
    // sampling rate index must not be 0x03 (reserved)
    ((audioBuffer[2] >> 2) & 0x03) !== 0x03
  ) {
    return 'audio/mpeg';
  }

  // Fallback: raw PCM/L16 として扱う
  return 'audio/pcm';
};

/** SSMLタグを除去してプレーンテキストに変換する（<sub alias="X">Y</sub> → X） */
const stripSsml = (text: string): string =>
  text
    .replace(
      /<sub\s+alias="([^"]*)">([^<]*)<\/sub>/gi,
      (_match, alias) => alias
    )
    .replace(
      /<say-as\s+interpret-as="cardinal">(\d+)<\/say-as>/gi,
      (_match, num) => String(num)
    )
    .replace(/<break\s*[^/]*\/>/gi, ' ')
    .replace(/<speak>|<\/speak>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

/** Cloud Text-to-Speech の Gemini-TTS を使用してテキストを音声に変換する。 */
const synthesizeWithGemini = async (
  projectId: string,
  text: string,
  languageCode: string,
  voiceName: string,
  prompt?: string,
  options?: {
    volumeGainDb?: number;
  }
): Promise<SynthesizedAudio> => {
  const client = await googleAuth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  const accessToken = accessTokenResponse.token;
  if (!accessToken) {
    throw new Error('Failed to acquire Google access token for Gemini TTS');
  }

  const ttsUrl = `https://texttospeech.googleapis.com/${GOOGLE_TTS_API_VERSION}/text:synthesize`;
  const res = await fetch(ttsUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json; charset=UTF-8',
      'x-goog-user-project': projectId,
    },
    body: JSON.stringify({
      input: {
        text: stripSsml(text),
        ...(prompt ? { prompt } : {}),
      },
      voice: {
        languageCode,
        name: voiceName,
        modelName: GEMINI_TTS_MODEL,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        ...(options?.volumeGainDb != null
          ? { volumeGainDb: options.volumeGainDb }
          : {}),
      },
    }),
    method: 'POST',
    signal: AbortSignal.timeout(30000),
  });

  const json = (await res.json()) as {
    audioContent?: string;
    error?: unknown;
  };
  if (!res.ok || !json.audioContent) {
    throw new Error(
      `Gemini TTS API returned ${res.status}: ${JSON.stringify(json.error ?? json)}`
    );
  }

  return {
    audioContent: json.audioContent,
    mimeType: 'audio/mpeg',
  };
};

export const tts = onCall(
  {
    region: 'asia-northeast1',
  },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError(
        'failed-precondition',
        'The function must be called while authenticated.'
      );
    }

    const ssmlJa: string | undefined = req.data.ssmlJa;
    if (!(typeof ssmlJa === 'string') || ssmlJa.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        `The function must be called with one argument "ssmlJa" containing the message to add.`
      );
    }

    if (typeof req.data.ssmlEn !== 'string' || req.data.ssmlEn.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        `The function must be called with one argument "ssmlEn" containing the message to add.`
      );
    }

    const ssmlEn = normalizeRomanText(req.data.ssmlEn);

    if (ssmlEn.trim().length === 0) {
      throw new HttpsError(
        'invalid-argument',
        `The function must be called with one argument "ssmlEn" containing the message to add.`
      );
    }

    let ttsConfig: FirebaseFirestore.DocumentData | undefined;
    try {
      const ttsConfigDoc = await firestore
        .collection('configs')
        .doc('tts')
        .get();
      ttsConfig = ttsConfigDoc.data();
    } catch (e) {
      console.warn(
        'Failed to read TTS config from Firestore, using defaults:',
        e
      );
    }
    const defaultJaVoice = ttsConfig?.jaVoiceName || 'Aoede';
    const defaultEnVoice = ttsConfig?.enVoiceName || 'Aoede';

    const jaVoiceName =
      (typeof req.data.jaVoiceName === 'string' && req.data.jaVoiceName) ||
      defaultJaVoice;
    const enVoiceName =
      (typeof req.data.enVoiceName === 'string' && req.data.enVoiceName) ||
      defaultEnVoice;

    const voicesCollection = firestore
      .collection('caches')
      .doc('tts')
      .collection('voices');

    const hashAlgorithm = 'sha256';
    const version = 9;
    const hashPayloadObj = {
      enModel: GEMINI_TTS_MODEL,
      enVoiceName,
      jaVoiceName,
      ssmlEn,
      ssmlJa,
      version,
    } as const;
    const hashPayload = JSON.stringify(
      hashPayloadObj,
      Object.keys(hashPayloadObj).sort()
    );

    const id = createHash(hashAlgorithm).update(hashPayload).digest('hex');

    const snapshot = await voicesCollection.doc(id).get();

    if (snapshot.exists) {
      const data = snapshot.data() ?? {};
      const pathJa = data?.pathJa;
      const pathEn = data?.pathEn;
      if (typeof pathJa === 'string' && typeof pathEn === 'string') {
        try {
          const [jaAudioData, enAudioData] = await Promise.all([
            storage.bucket().file(pathJa).download(),
            storage.bucket().file(pathEn).download(),
          ]);
          const jaBuffer = jaAudioData?.[0] ?? null;
          const enBuffer = enAudioData?.[0] ?? null;
          const jaAudioContent = jaBuffer?.toString('base64') ?? null;
          const enAudioContent = enBuffer?.toString('base64') ?? null;
          if (jaAudioContent && enAudioContent) {
            const jaRawMime =
              (typeof data?.jaAudioMimeType === 'string' &&
                data.jaAudioMimeType) ||
              (jaBuffer ? sniffAudioMimeType(jaBuffer) : 'audio/pcm');
            const enRawMime =
              (typeof data?.enAudioMimeType === 'string' &&
                data.enAudioMimeType) ||
              (enBuffer ? sniffAudioMimeType(enBuffer) : 'audio/pcm');

            return {
              id,
              jaAudioContent,
              enAudioContent,
              jaAudioMimeType: jaRawMime,
              enAudioMimeType: enRawMime,
            };
          }
        } catch (e) {
          console.warn(
            'Cache hit but download failed. Falling back to synthesis.',
            e
          );
        }
      } else {
        console.warn(
          'Cache doc missing pathJa/pathEn. Falling back to synthesis.'
        );
      }
    }

    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    if (!projectId) {
      throw new HttpsError('failed-precondition', 'GCP project ID is not set');
    }

    try {
      const [jaAudio, enAudio] = await Promise.all([
        synthesizeWithGemini(
          projectId,
          ssmlJa,
          'ja-JP',
          jaVoiceName,
          '以下の日本語を、現代的な鉄道自動放送のように読み上げてください。全体的に平板なイントネーションを維持し、感情を込めず淡々と読んでください。文のイントネーションは文末に向かって自然に下降させてください。助詞（は、の、で、を等）で不自然にピッチを上げないでください。駅名や路線名は平板アクセントで読んでください（一般会話のアクセントとは異なります）。無駄な間を入れず、一定のテンポで読み進めてください。漢字の読みは一文字も省略せず正確に読んでください。特に路線名は正式な読みに従ってください（例：副都心線→ふくとしんせん、東海道線→とうかいどうせん、山手線→やまのてせん）。鉄道会社の略称も正確に読んでください（例：名鉄→めいてつ、京急→けいきゅう、京王→けいおう、阪急→はんきゅう、阪神→はんしん、南海→なんかい、近鉄→きんてつ、西鉄→にしてつ、東急→とうきゅう、小田急→おだきゅう、京成→けいせい、相鉄→そうてつ）。'
        ),
        synthesizeWithGemini(
          projectId,
          ssmlEn,
          'en-US',
          enVoiceName,
          'Read the following in a calm, clear, and composed tone like a modern train announcement. Speak quickly and crisply with a swift, efficient delivery. Do not linger on words or pause unnecessarily. Maintain a steady, relaxed intonation despite the fast pace. The text contains Japanese railway station names and line names in romanized form. Pronounce them using Japanese vowel rules, NOT English rules: a=ah, i=ee, u=oo, e=eh, o=oh. Every vowel is always pronounced the same way regardless of surrounding letters (e.g. "Inage" = ee-nah-geh, NOT "inn-idge"; "Meguro" = meh-goo-roh; "Ebisu" = eh-bee-soo; "Ome" = oh-meh, NOT "ohm"). Never apply English spelling conventions like silent e, soft g, or vowel shifts to these names.'
        ),
      ]);
      const jaAudioContent = jaAudio.audioContent;
      const jaAudioMimeType = jaAudio.mimeType || 'audio/mpeg';
      const enAudioContent = enAudio.audioContent;
      const enAudioMimeType = enAudio.mimeType || 'audio/mpeg';

      const cacheTopic = pubsub.topic('tts-cache');
      cacheTopic
        .publishMessage({
          json: {
            id,
            jaAudioContent,
            enAudioContent,
            jaAudioMimeType,
            enAudioMimeType,
            ssmlJa,
            ssmlEn,
            voiceJa: jaVoiceName,
            voiceEn: enVoiceName,
            enModel: GEMINI_TTS_MODEL,
          },
        })
        .catch((err) => {
          console.error('Failed to publish cache message:', err);
          // キャッシュ失敗はユーザーに影響しないため、エラーは投げない
        });

      return {
        id,
        jaAudioContent,
        enAudioContent,
        jaAudioMimeType,
        enAudioMimeType,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('TTS API call failed:', error);
      throw new HttpsError('internal', 'TTS synthesis failed');
    }
  }
);
