import * as jaconv from 'jaconv';
import {katakanaToHiragana} from './kanaToHiragana';

export const katakanaToRomaji = (src: string) => {
  const hiragana = katakanaToHiragana(src);
  const hebon = jaconv.toHebon(hiragana).toLowerCase();
  return hebon[0].toUpperCase() + hebon.substring(1);
};
