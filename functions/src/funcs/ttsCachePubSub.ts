import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';

const firestore = admin.firestore();
const storage = admin.storage();

const getCacheFileExtension = (mimeType: string): 'mp3' | 'wav' | 'pcm' => {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('mpeg') || normalized.includes('mp3')) {
    return 'mp3';
  }
  if (normalized.includes('wav')) {
    return 'wav';
  }
  return 'pcm';
};

export const ttsCachePubSub = onMessagePublished(
  { topic: 'tts-cache', region: 'asia-northeast1' },
  async (event) => {
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
    } = event.data.message.json;

    if (!id || !jaAudioContent || !enAudioContent) {
      console.error('Invalid payload for tts-cache', {
        hasId: !!id,
        hasJa: !!jaAudioContent,
        hasEn: !!enAudioContent,
      });
      return;
    }

    const jaTtsCachePathBase = 'caches/tts/ja';
    const jaTtsBuf = Buffer.from(jaAudioContent, 'base64');
    const jaContentType =
      typeof jaAudioMimeType === 'string' && jaAudioMimeType
        ? jaAudioMimeType
        : 'audio/pcm';
    const jaExt = getCacheFileExtension(jaContentType);
    const jaTtsCachePath = `${jaTtsCachePathBase}/${id}.${jaExt}`;

    const enTtsCachePathBase = 'caches/tts/en';
    const enTtsBuf = Buffer.from(enAudioContent, 'base64');
    const enContentType =
      typeof enAudioMimeType === 'string' && enAudioMimeType
        ? enAudioMimeType
        : 'audio/pcm';
    const enExt = getCacheFileExtension(enContentType);
    const enTtsCachePath = `${enTtsCachePathBase}/${id}.${enExt}`;

    await Promise.all([
      storage
        .bucket()
        .file(jaTtsCachePath)
        .save(jaTtsBuf, { contentType: jaContentType, resumable: false }),
      storage
        .bucket()
        .file(enTtsCachePath)
        .save(enTtsBuf, { contentType: enContentType, resumable: false }),
    ]);

    await firestore
      .collection('caches')
      .doc('tts')
      .collection('voices')
      .doc(id)
      .set({
        id,
        ssmlJa,
        pathJa: jaTtsCachePath,
        jaAudioMimeType: jaContentType,
        voiceJa,
        ssmlEn,
        pathEn: enTtsCachePath,
        enAudioMimeType: enContentType,
        voiceEn,
        createdAt: Timestamp.now(),
      });
  }
);
