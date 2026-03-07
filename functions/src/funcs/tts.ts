import { createHash } from 'node:crypto';
import { PubSub } from '@google-cloud/pubsub';
import { type GenerateContentResponse, VertexAI } from '@google-cloud/vertexai';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { encodePcmToMp3 } from '../utils/encodeMp3';
import { applyLegacyIpaReplacements } from '../utils/legacyIpa';
import { normalizeRomanText } from '../utils/normalize';

process.env.TZ = 'Asia/Tokyo';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const firestore = admin.firestore();
const storage = admin.storage();
const pubsub = new PubSub();

const GEMINI_TTS_MODEL = 'gemini-2.5-flash-tts';
const VERTEX_AI_LOCATION = 'us-central1';

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

  // MP3 frame sync: 11111111 111xxxxx
  if (
    audioBuffer.length >= 2 &&
    audioBuffer[0] === 0xff &&
    (audioBuffer[1] & 0xe0) === 0xe0
  ) {
    return 'audio/mpeg';
  }

  // Fallback: raw PCM/L16 として扱う
  return 'audio/pcm';
};

/** 音声バッファが既にMP3であればそのまま返し、PCM/WAVならMP3にエンコードする */
const ensureMp3 = async (
  audioBuffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> => {
  if (mimeType === 'audio/mpeg') {
    return { buffer: audioBuffer, mimeType };
  }
  return encodePcmToMp3(audioBuffer);
};

/** SSMLタグを除去してプレーンテキストに変換する（<sub alias="X">Y</sub> → X） */
const stripSsml = (text: string): string =>
  text
    .replace(/<sub\s+alias="([^"]*)">[^<]*<\/sub>/gi, '$1')
    .replace(/<break\s*[^/]*\/>/gi, ' ')
    .replace(/<speak>|<\/speak>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

/**
 * Gemini TTS を使用してテキストを音声に変換する。
 *
 * @param projectId - GCP プロジェクト ID
 * @param text - 読み上げ対象テキスト（SSML タグは内部で除去される）
 * @param voiceName - 使用する音声名（例: "Aoede"）
 * @param prompt - 読み上げスタイルを指示するプロンプト（任意）
 * @returns Base64 エンコードされた音声データと MIME タイプ
 *
 * @remarks
 * `@google-cloud/vertexai` の型定義には `speechConfig` が含まれていないため、
 * `generationConfig` に対する型アサーションは意図的なものである。
 */
const synthesizeWithGemini = async (
  projectId: string,
  text: string,
  voiceName: string,
  prompt?: string
): Promise<SynthesizedAudio> => {
  const vertexAI = new VertexAI({
    project: projectId,
    location: VERTEX_AI_LOCATION,
  });

  const model = vertexAI.getGenerativeModel({
    model: GEMINI_TTS_MODEL,
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    } as Parameters<typeof vertexAI.getGenerativeModel>[0]['generationConfig'],
  });

  const response = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: prompt ? `${prompt}\n${stripSsml(text)}` : stripSsml(text),
          },
        ],
      },
    ],
  });

  const result: GenerateContentResponse = response.response;
  const inlineData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const audioData = inlineData?.data;

  if (!audioData) {
    const status = result.candidates?.[0]?.finishReason ?? 'UNKNOWN';
    const usage = result.usageMetadata;
    throw new Error(
      `Gemini TTS (${GEMINI_TTS_MODEL}) returned no audio data — finishReason: ${status}, usage: ${JSON.stringify(usage)}`
    );
  }

  return {
    audioContent: audioData,
    mimeType: inlineData?.mimeType,
  };
};

export const tts = onCall({ region: 'asia-northeast1' }, async (req) => {
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

  let ssmlEn = normalizeRomanText(req.data.ssmlEn);

  // <phoneme>タグが埋め込まれていない場合はレガシーIPA置換を適用
  if (!ssmlEn.includes('<phoneme')) {
    ssmlEn = applyLegacyIpaReplacements(ssmlEn);
  }

  if (ssmlEn.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      `The function must be called with one argument "ssmlEn" containing the message to add.`
    );
  }

  let ttsConfig: FirebaseFirestore.DocumentData | undefined;
  try {
    const ttsConfigDoc = await firestore.collection('configs').doc('tts').get();
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
  const version = 5;
  const hashPayloadObj = {
    enVoiceName,
    jaVoiceName,
    model: GEMINI_TTS_MODEL,
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

          const [jaMp3, enMp3] = await Promise.all([
            ensureMp3(jaBuffer, jaRawMime),
            ensureMp3(enBuffer, enRawMime),
          ]);

          return {
            id,
            jaAudioContent: jaMp3.buffer.toString('base64'),
            enAudioContent: enMp3.buffer.toString('base64'),
            jaAudioMimeType: jaMp3.mimeType,
            enAudioMimeType: enMp3.mimeType,
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
        jaVoiceName,
        '以下のテキストを日本の鉄道車内アナウンスとしてやや早口で読み上げてください。駅名・路線名は正確に発音してください:'
      ),
      synthesizeWithGemini(
        projectId,
        ssmlEn,
        enVoiceName,
        'Read the following at a brisk, quick pace like a train announcement. The text contains Japanese railway station names and line names in romanized form. Pronounce them accurately:'
      ),
    ]);

    const jaAudioBuffer = Buffer.from(jaAudio.audioContent, 'base64');
    const enAudioBuffer = Buffer.from(enAudio.audioContent, 'base64');

    const [jaMp3, enMp3] = await Promise.all([
      ensureMp3(
        jaAudioBuffer,
        jaAudio.mimeType || sniffAudioMimeType(jaAudioBuffer)
      ),
      ensureMp3(
        enAudioBuffer,
        enAudio.mimeType || sniffAudioMimeType(enAudioBuffer)
      ),
    ]);

    const jaAudioContent = jaMp3.buffer.toString('base64');
    const enAudioContent = enMp3.buffer.toString('base64');
    const jaAudioMimeType = jaMp3.mimeType;
    const enAudioMimeType = enMp3.mimeType;

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
          model: GEMINI_TTS_MODEL,
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
    console.error('Gemini TTS API call failed:', error);
    throw new HttpsError('internal', 'TTS synthesis failed');
  }
});
