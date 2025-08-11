import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { createHash } from 'node:crypto';
import { normalizeRomanText } from '../utils/normalize';
import * as admin from 'firebase-admin';

process.env.TZ = 'Asia/Tokyo';
admin.initializeApp();
const firestore = admin.firestore();

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
      `The function must be called with one arguments "ssmlJa" containing the message ssmlJa to add.`
    );
  }

  const ssmlEn: string | undefined = normalizeRomanText(req.data.ssmlEn)
    // Airport Terminal 1･2等
    .replace(/･/g, ' ')
    // Otsuka・Teikyo-Daigakuなど
    .replace(/・/g, ' ')
    // 環状運転の場合に & が含まれる可能性があるため置換
    .replace(/&/g, 'and')
    // 全角記号
    .replace(/[！-／：-＠［-｀｛-～、-〜”’・]+/g, ' ')
    // 明治神宮前駅等の駅名にバッククォートが含まれる場合があるため除去
    .replace(/`/g, '')
    // 一丁目で終わる駅
    .replace(
      /\-itchome/gi,
      `<phoneme alphabet="ipa" ph="itt͡ɕoːme">いっちょうめ</phoneme>`
    )
    // 新宿三丁目など
    .replace(
      /\-sanchome/gi,
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
    // 日本語はjoを「ホ」と読まない
    .replace(/jo/gi, '<phoneme alphabet="ipa" ph="ʤo">じょ</phoneme>')
    .replace(/JR/gi, 'J-R')
    .replace(
      /Ryogoku/gi,
      '<phoneme alphabet="ipa" ph="ɾʲoːɡokɯ">りょうごく</phoneme>'
    )
    .replace(/koen/gi, '<phoneme alphabet="ipa" ph="koeɴ">こえん</phoneme>');

  if (typeof ssmlEn !== 'string' || ssmlEn.length === 0) {
    throw new HttpsError(
      'invalid-argument',
      `The function must be called with one arguments "ssmlEn" containing the message ssmlEn to add.`
    );
  }

  const jaVoiceName = 'ja-JP-Standard-B';
  const enVoiceName = 'en-US-Standard-G';

  const voicesCollection = firestore
    .collection('caches')
    .doc('tts')
    .collection('voices');

  const hashAlgorithm = 'md5';
  const hashData = ssmlJa + ssmlEn + jaVoiceName + enVoiceName;
  const id = createHash(hashAlgorithm).update(hashData).digest('hex');

  const snapshot = await voicesCollection.where('id', '==', id).get();

  if (!snapshot.empty) {
    const jaAudioData = snapshot.docs[0].get('pathJa');
    const enAudioData = snapshot.docs[0].get('pathEn');
    return { jaAudioData, enAudioData, id };
  }

  // ここで音声合成API呼び出しやキャッシュ保存などの処理を追加
  // ...必要に応じて実装...

  return { id };
});
