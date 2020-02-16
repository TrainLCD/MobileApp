import * as jaconv from 'jaconv';
import {katakanaToHiragana} from './kanaToHiragana';

export const katakanaToRomaji = (src: string, forLine?: boolean) => {
  const hiragana = katakanaToHiragana(src);
  const senReplaced = forLine
    ? hiragana.replace(/(.*)せん/, '$1 line')
    : hiragana;
  const rainReplaced = forLine
    ? senReplaced.replace(/(.*)らいん/, '$1 line')
    : senReplaced;
  const expressReplaced = forLine
    ? rainReplaced.replace(/(.*)えくすぷれす/, '$1 express')
    : rainReplaced;
  const hebon = jaconv.toHebon(expressReplaced).toLowerCase();
  return hebon[0].toUpperCase() + hebon.substring(1);
};
