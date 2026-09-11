// よくある質問。GNSS(GPS)非搭載端末が非対応であることなど、アプリ側で検知・修正できない
// 動作条件を記載している。端末が測位ハードウェアを持つかはiOSが公開APIで提供しておらず、
// 測位の挙動から推定する方法も地下鉄のみを利用する利用者などを誤判定するため、
// アプリ内では判定せずここへ誘導する。
export const FAQ_URL = 'https://trainlcd.app/faq';
export const APP_STORE_URL =
  'https://apps.apple.com/jp/app/trainlcd/id1486355943';
export const GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=me.tinykitten.trainlcd';
