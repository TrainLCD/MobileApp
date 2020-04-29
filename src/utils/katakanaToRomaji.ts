import * as jaconv from 'jaconv';
import { Station } from '../models/StationAPI';
import katakanaToHiragana from './kanaToHiragana';

const katakanaToRomaji = (station: Station): string => {
  // スペースやハイフンが入っている場合正式名称の可能性が高い
  if (station.nameR.includes('-') || station.nameR.includes(' ')) {
    return station.nameR[0].toUpperCase() + station.nameR.substring(1);
  }
  const hiragana = katakanaToHiragana(station.nameK);
  // 三軒茶屋
  let replaced = hiragana;
  if (hiragana.includes('ぢゃ')) {
    replaced = hiragana.replace('ぢゃ', 'じゃ');
  }
  const hebon = jaconv.toHebon(replaced).toLowerCase();
  return hebon[0].toUpperCase() + hebon.substring(1);
};

export default katakanaToRomaji;
