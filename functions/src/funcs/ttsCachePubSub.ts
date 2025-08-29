import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';

const firestore = admin.firestore();
const storage = admin.storage();

export const ttsCachePubSub = onMessagePublished('tts-cache', async (event) => {
  const {
    id,
    jaAudioContent,
    enAudioContent,
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
  const jaTtsCachePath = `${jaTtsCachePathBase}/${id}.mp3`;

  const enTtsCachePathBase = 'caches/tts/en';
  const enTtsBuf = Buffer.from(enAudioContent, 'base64');
  const enTtsCachePath = `${enTtsCachePathBase}/${id}.mp3`;

  await Promise.all([
    storage
      .bucket()
      .file(jaTtsCachePath)
      .save(jaTtsBuf, { contentType: 'audio/mpeg', resumable: false }),
    storage
      .bucket()
      .file(enTtsCachePath)
      .save(enTtsBuf, { contentType: 'audio/mpeg', resumable: false }),
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
      voiceJa,
      ssmlEn,
      pathEn: enTtsCachePath,
      voiceEn,
      createdAt: Timestamp.now(),
    });
});
