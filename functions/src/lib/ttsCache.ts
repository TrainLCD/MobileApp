/**
 * 合成済み TTS 音声を R2 に保存し、メタを KV に書き込む。
 * Queues のメッセージ上限(128KB)に音声が収まらないため、キューを介さず
 * /tts ハンドラから ctx.waitUntil で直接呼ぶ。
 */
import type { Env, TtsCachePayload } from '../types';
import { base64ToBytes } from './crypto';

const getCacheFileExtension = (mimeType: string): 'mp3' | 'wav' | 'pcm' => {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  if (normalized.includes('wav')) return 'wav';
  return 'pcm';
};

export const writeTtsCache = async (
  payload: TtsCachePayload,
  env: Env
): Promise<void> => {
  const {
    id,
    jaAudioContent,
    enAudioContent,
    jaAudioMimeType,
    enAudioMimeType,
    ssmlJa,
    ssmlEn,
    voiceJa,
    voiceEn,
  } = payload;

  if (!id || !jaAudioContent || !enAudioContent) {
    console.error('Invalid payload for tts cache', {
      hasId: !!id,
      hasJa: !!jaAudioContent,
      hasEn: !!enAudioContent,
    });
    return;
  }

  const jaContentType = jaAudioMimeType || 'audio/pcm';
  const enContentType = enAudioMimeType || 'audio/pcm';
  const jaPath = `caches/tts/ja/${id}.${getCacheFileExtension(jaContentType)}`;
  const enPath = `caches/tts/en/${id}.${getCacheFileExtension(enContentType)}`;

  await Promise.all([
    env.TTS_BUCKET.put(jaPath, base64ToBytes(jaAudioContent), {
      httpMetadata: { contentType: jaContentType },
    }),
    env.TTS_BUCKET.put(enPath, base64ToBytes(enAudioContent), {
      httpMetadata: { contentType: enContentType },
    }),
  ]);

  await env.TTS_KV.put(
    `voice:${id}`,
    JSON.stringify({
      id,
      ssmlJa,
      pathJa: jaPath,
      jaAudioMimeType: jaContentType,
      voiceJa,
      ssmlEn,
      pathEn: enPath,
      enAudioMimeType: enContentType,
      voiceEn,
      createdAt: new Date().toISOString(),
    })
  );
};
