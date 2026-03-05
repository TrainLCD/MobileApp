import { createHash } from 'node:crypto';
import { PubSub } from '@google-cloud/pubsub';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { applyLegacyIpaReplacements } from '../utils/legacyIpa';
import { normalizeRomanText } from '../utils/normalize';

process.env.TZ = 'Asia/Tokyo';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const firestore = admin.firestore();
const storage = admin.storage();
const pubsub = new PubSub();

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

  let ssmlEn = normalizeRomanText(req.data.ssmlEn)
    // Airport Terminal 1･2等
    .replace(/･/g, ' ')
    // Otsuka・Teikyo-Daigakuなど
    .replace(/・/g, ' ')
    // 環状運転の場合に & が含まれる可能性があるため置換
    .replace(/&(?!#\d+;|#x[0-9A-Fa-f]+;|\w+;)/g, 'and')
    // 全角記号
    .replace(/[！-／：-＠［-｀｛-～、-〜”・]+/g, ' ')
    // 明治神宮前駅等の駅名にバッククォートが含まれる場合があるため除去
    .replace(/`/g, '')
    .replace(/JR/gi, 'J-R')
    // 都営バスを想定
    .replace(/.Sta\./gi, ' Station')
    .replace(/.Univ\./gi, ' University')
    .replace(/.Hp\./gi, ' Hospital');

  // アプリ側でnameIpaによる<phoneme>タグが埋め込まれていない場合はレガシーIPA置換を適用
  if (!ssmlEn.includes('<phoneme')) {
    ssmlEn = applyLegacyIpaReplacements(ssmlEn);
  }

  if (ssmlEn.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      `The function must be called with one argument "ssmlEn" containing the message to add.`
    );
  }

  const jaVoiceName =
    process.env.GOOGLE_TTS_JA_VOICE_NAME || 'ja-JP-Standard-B';
  const enVoiceName =
    process.env.GOOGLE_TTS_EN_VOICE_NAME || 'en-US-Standard-G';
  const audioEncoding = 'MP3';
  const volumeGainEnv = process.env.GOOGLE_TTS_VOLUME_GAIN_DB;
  const volumeGainParsed =
    volumeGainEnv === undefined ? 6 : Number(volumeGainEnv);
  const volumeGainDb = Number.isFinite(volumeGainParsed)
    ? Math.max(-96, Math.min(16, volumeGainParsed))
    : 6;
  const effectsProfileId = ['handset-class-device'];
  const apiVersion = 'v1';

  const voicesCollection = firestore
    .collection('caches')
    .doc('tts')
    .collection('voices');

  const hashAlgorithm = 'sha256';
  const version = 1;
  const hashPayloadObj = {
    apiVersion,
    audioEncoding,
    effectsProfileId,
    enVoiceName,
    jaVoiceName,
    ssmlEn,
    ssmlJa,
    volumeGainDb,
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
        const jaAudioContent = jaAudioData?.[0]?.toString('base64') ?? null;
        const enAudioContent = enAudioData?.[0]?.toString('base64') ?? null;
        if (jaAudioContent && enAudioContent) {
          return { id, jaAudioContent, enAudioContent };
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

  if (!process.env.GOOGLE_TTS_API_KEY) {
    throw new HttpsError(
      'failed-precondition',
      'GOOGLE_TTS_API_KEY is not set'
    );
  }
  const ttsUrl = `https://texttospeech.googleapis.com/${apiVersion}/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`;

  const reqBodyJa = {
    input: {
      ssml: ssmlJa,
    },
    voice: {
      languageCode: 'ja-JP',
      name: jaVoiceName,
    },
    audioConfig: {
      audioEncoding,
      volumeGainDb,
      effectsProfileId,
    },
  };

  const reqBodyEn = {
    input: {
      ssml: ssmlEn,
    },
    voice: {
      languageCode: 'en-US',
      name: enVoiceName,
    },
    audioConfig: {
      audioEncoding,
      volumeGainDb,
      effectsProfileId,
    },
  };

  try {
    const [jaRes, enRes] = await Promise.all([
      fetch(ttsUrl, {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(reqBodyJa),
        method: 'POST',
        signal: AbortSignal.timeout(30000), // 30秒のタイムアウト
      }),
      fetch(ttsUrl, {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(reqBodyEn),
        method: 'POST',
        signal: AbortSignal.timeout(30000), // 30秒のタイムアウト
      }),
    ]);

    const [{ audioContent: jaAudioContent }, { audioContent: enAudioContent }] =
      await Promise.all([jaRes.json(), enRes.json()]);

    const cacheTopic = pubsub.topic('tts-cache');
    cacheTopic
      .publishMessage({
        json: {
          id,
          jaAudioContent,
          enAudioContent,
          ssmlJa,
          ssmlEn,
          voiceJa: jaVoiceName,
          voiceEn: enVoiceName,
          audioEncoding,
          volumeGainDb,
          effectsProfileId,
          apiVersion,
        },
      })
      .catch((err) => {
        console.error('Failed to publish cache message:', err);
        // キャッシュ失敗はユーザーに影響しないため、エラーは投げない
      });

    return { id, jaAudioContent, enAudioContent };
  } catch (error) {
    console.error('TTS API call failed:', error);
    throw new HttpsError('internal', 'TTS synthesis failed');
  }
});
