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

const GOOGLE_TTS_API_VERSION = 'v1';
const DEFAULT_JA_VOICE_NAME = 'ja-JP-Standard-B';
const DEFAULT_EN_VOICE_NAME = 'en-US-Standard-G';

const TTS_CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5分
let ttsConfigCache: {
  data: FirebaseFirestore.DocumentData | undefined;
  fetchedAt: number;
} | null = null;

const getTtsConfig = async (): Promise<
  FirebaseFirestore.DocumentData | undefined
> => {
  if (
    ttsConfigCache &&
    Date.now() - ttsConfigCache.fetchedAt < TTS_CONFIG_CACHE_TTL_MS
  ) {
    return ttsConfigCache.data;
  }
  try {
    const doc = await firestore.collection('configs').doc('tts').get();
    const data = doc.data();
    ttsConfigCache = { data, fetchedAt: Date.now() };
    return data;
  } catch (e) {
    if (ttsConfigCache) {
      return ttsConfigCache.data;
    }
    throw e;
  }
};

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

const getAccessToken = async (): Promise<string> => {
  const client = await googleAuth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  const token = accessTokenResponse.token;
  if (!token) {
    throw new Error('Failed to acquire Google access token for TTS');
  }
  return token;
};

/** Cloud Text-to-Speech の Neural2 を使用してテキストを音声に変換する。 */
const synthesizeWithNeural2 = async (
  projectId: string,
  accessToken: string,
  text: string,
  languageCode: string,
  voiceName: string,
  options?: {
    volumeGainDb?: number;
  }
): Promise<SynthesizedAudio> => {
  const ttsUrl = `https://texttospeech.googleapis.com/${GOOGLE_TTS_API_VERSION}/text:synthesize`;
  const res = await fetch(ttsUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json; charset=UTF-8',
      'x-goog-user-project': projectId,
    },
    body: JSON.stringify({
      input: {
        ssml: text,
      },
      voice: {
        languageCode,
        name: voiceName,
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
      `Neural2 TTS API returned ${res.status}: ${JSON.stringify(json.error ?? json)}`
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
      ttsConfig = await getTtsConfig();
    } catch (e) {
      console.warn(
        'Failed to read TTS config from Firestore, using defaults:',
        e
      );
    }
    const defaultJaVoice = ttsConfig?.jaVoiceName || DEFAULT_JA_VOICE_NAME;
    const defaultEnVoice = ttsConfig?.enVoiceName || DEFAULT_EN_VOICE_NAME;

    const jaVoiceName =
      (typeof req.data.jaVoiceName === 'string' &&
        req.data.jaVoiceName.trim()) ||
      defaultJaVoice;
    const enVoiceName =
      (typeof req.data.enVoiceName === 'string' &&
        req.data.enVoiceName.trim()) ||
      defaultEnVoice;

    const strippedJa = stripSsml(ssmlJa);
    const strippedEn = stripSsml(ssmlEn);

    if (strippedJa.trim().length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'ssmlJa contains no visible text after stripping SSML tags'
      );
    }
    if (strippedEn.trim().length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'ssmlEn contains no visible text after stripping SSML tags'
      );
    }

    const TEXT_BYTE_LIMIT = 4000;
    const jaTextBytes = Buffer.byteLength(strippedJa, 'utf8');
    const enTextBytes = Buffer.byteLength(strippedEn, 'utf8');

    if (jaTextBytes > TEXT_BYTE_LIMIT) {
      throw new HttpsError(
        'invalid-argument',
        `ssmlJa text exceeds ${TEXT_BYTE_LIMIT} byte limit (${jaTextBytes} bytes)`
      );
    }
    if (enTextBytes > TEXT_BYTE_LIMIT) {
      throw new HttpsError(
        'invalid-argument',
        `ssmlEn text exceeds ${TEXT_BYTE_LIMIT} byte limit (${enTextBytes} bytes)`
      );
    }

    const voicesCollection = firestore
      .collection('caches')
      .doc('tts')
      .collection('voices');

    const hashAlgorithm = 'sha256';
    const version = 11;
    const hashPayloadObj = {
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
      const accessToken = await getAccessToken();
      const [jaAudio, enAudio] = await Promise.all([
        synthesizeWithNeural2(
          projectId,
          accessToken,
          ssmlJa,
          'ja-JP',
          jaVoiceName
        ),
        synthesizeWithNeural2(
          projectId,
          accessToken,
          ssmlEn,
          'en-US',
          enVoiceName
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
