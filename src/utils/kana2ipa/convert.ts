/* eslint-disable @typescript-eslint/no-var-requires */
// referenced: https://github.com/amanoese/kana2ipa
import XRegExp from 'xregexp';

XRegExp.install('astral');

const ipa = require('./ipa.json');
const ipaSmall = require('./ipa-small.json');

const hiragana2katakana = (text: string): string => {
  const regexp = XRegExp('\\p{Hiragana}', 'g');
  return text.replace(regexp, (v) =>
    String.fromCharCode(+v.charCodeAt(0) + 0x60)
  );
};
const kana2ipa = (inText: string): string => {
  if (inText.length <= 0) {
    return inText;
  }
  const ipaSmallMatch = Object.keys(ipaSmall).join('|').replace(/.*/, '($&)');

  const katakanaText = hiragana2katakana(inText);
  // replace Basic Word
  const bIpaString = katakanaText
    .normalize('NFKC') // harf size to wide size
    .replace(new RegExp(ipaSmallMatch, 'g'), (v) => ipaSmall[v] || v)
    .match(/./gu)
    .map((v) => ipa[v] || v)
    .join('');

  // important ん is Specialy word
  const nIpaString = bIpaString
    .replace(/N(p|b|m)/g, 'm$1')
    .replace(/N(t|d|t͡s|n)/gu, 'n$1')
    .replace(/N(k|ɡ)/g, 'ŋ$1')
    .replace(/N(ɽ)/g, 'ṉ$1')
    .replace(/(.)N(a|i|ɯ|e|o|s|h|j|w)/gu, '$1$1\u0303$2')
    .replace(/N/gu, 'ɴ')
    .normalize('NFC');

  // convert Specialy word
  const mIpaString = nIpaString
    .replace(/ッ(.)/gu, '$1$1')
    .replace(/mm/gu, 'mː') // んの後にpの発音が来たとき用？
    .replace(/nn/gu, 'nː') // これはよくわかんない
    .replace(/oɯ/gu, 'oː') // おうの発音はオーになる？
    .replace(/(.)ー/gu, '$1ː')
    .normalize('NFC');

  return mIpaString;
};

export default kana2ipa;
