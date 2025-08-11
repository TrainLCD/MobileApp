import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

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
  const jaTtsCachePathBase = 'caches/tts/ja';
  const jaTtsBuf = Buffer.from(jaAudioContent, 'base64');
  const jaTtsCachePath = `${jaTtsCachePathBase}/${id}.mp3`;

  const enTtsCachePathBase = 'caches/tts/en';
  const enTtsBuf = Buffer.from(enAudioContent, 'base64');
  const enTtsCachePath = `${enTtsCachePathBase}/${id}.mp3`;

  await storage.bucket().file(jaTtsCachePath).save(jaTtsBuf);
  await storage.bucket().file(enTtsCachePath).save(enTtsBuf);
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
