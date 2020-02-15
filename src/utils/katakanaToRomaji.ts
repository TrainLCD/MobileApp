import * as jaconv from 'jaconv';
import {katakanaToHiragana} from './kanaToHiragana';

export const katakanaToRomaji = (src: string) => {
  const hiragana = katakanaToHiragana(src);
  const replaced = hiragana.replace(/(.*)せん/, '$1 line');
  const hebon = jaconv.toHebon(replaced).toLowerCase();
  return hebon[0].toUpperCase() + hebon.substring(1);
};
