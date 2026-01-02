import { createHash } from 'node:crypto';
import { PubSub } from '@google-cloud/pubsub';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
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

  const ssmlEn = normalizeRomanText(req.data.ssmlEn)
    // Airport Terminal 1･2等
    .replace(/･/g, ' ')
    // Otsuka・Teikyo-Daigakuなど
    .replace(/・/g, ' ')
    // 環状運転の場合に & が含まれる可能性があるため置換
    .replace(/&(?!#\d+;|#x[0-9A-Fa-f]+;|\w+;)/g, 'and')
    // 全角記号
    .replace(/[！-／：-＠［-｀｛-～、-〜”’・]+/g, ' ')
    // 明治神宮前駅等の駅名にバッククォートが含まれる場合があるため除去
    .replace(/`/g, '')
    // 日本語はjoを「ホ」と読まない
    .replace(/jo/gi, '<phoneme alphabet="ipa" ph="ʤo">じょ</phoneme>')
    // 一丁目で終わる駅
    .replace(
      /-itchome/gi,
      `<phoneme alphabet="ipa" ph="itt͡ɕoːme">いっちょうめ</phoneme>`
    )
    // 新宿三丁目など
    .replace(
      /-sanchome/gi,
      ' <phoneme alphabet="ipa" ph="sant͡ɕoːme">さんちょうめ</phoneme>'
    )
    // 宇部
    .replace(/Ube/gi, '<phoneme alphabet="ipa" ph="ɯbe">うべ</phoneme>')
    // 伊勢崎
    .replace(
      /Isesaki/gi,
      '<phoneme alphabet="ipa" ph="isesakʲi">いせさき</phoneme>'
    )
    // 目白
    .replace(/Mejiro/gi, '<phoneme alphabet="ipa" ph="meʤiɾo">めじろ</phoneme>')
    // カイセイ対策
    .replace(
      /Keisei/gi,
      '<phoneme alphabet="ipa" ph="keisei">けいせい</phoneme>'
    )
    // 押上
    .replace(
      /Oshiage/gi,
      `<phoneme alphabet="ipa" ph="'oɕiaɡe">おしあげ</phoneme>`
    )
    // 名鉄
    .replace(
      /Meitetsu/gi,
      '<phoneme alphabet="ipa" ph="meitetsɯ">めいてつ</phoneme>'
    )
    // 西武
    .replace(/Seibu/gi, '<phoneme alphabet="ipa" ph="seibɯ">せいぶ</phoneme>')
    // 取手駅
    .replace(
      /Toride/gi,
      '<phoneme alphabet="ipa" ph="toɾʲide">とりで</phoneme>'
    )
    // 吹上駅
    .replace(
      /Fukiage/gi,
      '<phoneme alphabet="ipa" ph="ɸɯkʲiaɡe">ふきあげ</phoneme>'
    )
    // 新橋
    .replace(
      /Shimbashi/gi,
      '<phoneme alphabet="ipa" ph="ɕimbaɕi">しんばし</phoneme>'
    )
    // 渋谷
    .replace(
      /Shibuya/gi,
      '<phoneme alphabet="ipa" ph="ɕibɯja">しぶや</phoneme>'
    )
    // 品川
    .replace(
      /Shinagawa/gi,
      '<phoneme alphabet="ipa" ph="ɕinaɡawa">しながわ</phoneme>'
    )
    // 上野
    .replace(/Ueno/gi, '<phoneme alphabet="ipa" ph="ɯeno">うえの</phoneme>')
    // 池袋
    .replace(
      /Ikebukuro/gi,
      '<phoneme alphabet="ipa" ph="ikebɯkɯɾo">いけぶくろ</phoneme>'
    )
    // 新宿
    .replace(
      /Shinjuku/gi,
      '<phoneme alphabet="ipa" ph="ɕiɲdʑɯkɯ">しんじゅく</phoneme>'
    )
    // 大阪
    .replace(
      /Osaka/gi,
      '<phoneme alphabet="ipa" ph="oːsaka">おおさか</phoneme>'
    )
    // 京都
    .replace(
      /Kyoto/gi,
      '<phoneme alphabet="ipa" ph="kʲoːto">きょうと</phoneme>'
    )
    // 横浜
    .replace(
      /Yokohama/gi,
      '<phoneme alphabet="ipa" ph="jokohama">よこはま</phoneme>'
    )
    // 千葉
    .replace(/Chiba/gi, '<phoneme alphabet="ipa" ph="t͡ɕiba">ちば</phoneme>')
    // 川崎
    .replace(
      /Kawasaki/gi,
      '<phoneme alphabet="ipa" ph="kawasakʲi">かわさき</phoneme>'
    )
    // 鶴見
    .replace(
      /Tsurumi/gi,
      '<phoneme alphabet="ipa" ph="t͡sɯɾɯmi">つるみ</phoneme>'
    )
    .replace(/JR/gi, 'J-R')
    .replace(
      /Ryogoku/gi,
      '<phoneme alphabet="ipa" ph="ɾʲoːɡokɯ">りょうごく</phoneme>'
    )
    .replace(/koen/gi, '<phoneme alphabet="ipa" ph="koeɴ">こえん</phoneme>')
    // 都営バスを想定
    .replace(/.Sta\./gi, ' Station')
    .replace(/.Hp\./gi, ' Hospital');

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
