import { Dimensions } from 'react-native';
import { STATION_NAME_FONT_SIZE } from '../constants';

const MIN_SCALE_FLOOR = 0.1;
// 実フォントの 1 文字あたりの幅は fontSize より狭い（Roboto Bold + CJK でおよそ 0.65〜0.75）。
// 1.0 寄りで見積もると KANA や長い英字駅名で「画面幅にはまだ余裕があるのにスケールが下がる」
// 状態になるため、実描画に近い値まで下げる。
const CHAR_WIDTH_RATIO = 0.7;

// adjustsFontSizeToFit は minimumFontScale 未指定だと 0.01 倍まで縮むため、
// 「はねだくうこうだいさんたーみなる」のような長文駅名で文字が潰れる。
// 画面幅にぎりぎり収まるスケールをフロアにして、それ以下の縮小を防ぐ。
export const calcStationNameMinScale = (
  text: string,
  widthRatio = 0.6,
  baseFontSize: number = STATION_NAME_FONT_SIZE
) => {
  if (!text) {
    return 1;
  }
  const availableWidth = Dimensions.get('window').width * widthRatio;
  const requiredFontSize = availableWidth / (text.length * CHAR_WIDTH_RATIO);
  const scale = requiredFontSize / baseFontSize;
  return Math.min(1, Math.max(scale, MIN_SCALE_FLOOR));
};
