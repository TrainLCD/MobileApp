import { Dimensions } from 'react-native';
import { STATION_NAME_FONT_SIZE } from '../constants';

// 横方向圧縮の下限。実機の駅名 LCD（JR 東日本 E235 系など）は長い駅名を
// およそ 50% 程度まで字幅を詰めて表示するため、その下限に合わせて 0.5 を採用する。
// これより下げると視認性が著しく落ちるので、これ以上は文字幅を縮めない。
const MIN_SCALE_FLOOR = 0.5;
// 実フォントの 1 文字あたりの幅は fontSize より狭い（Roboto Bold + CJK でおよそ 0.65〜0.75）。
// 1.0 寄りで見積もると KANA や長い英字駅名で「画面幅にはまだ余裕があるのにスケールが下がる」
// 状態になるため、実描画に近い値まで下げる。
const CHAR_WIDTH_RATIO = 0.7;

// Header の駅名 Text に `transform: [{ scaleX }]` として渡す横方向圧縮率を返す。
// 駅名がコンテナ幅に収まる場合は 1（無加工）を返し、はみ出す場合のみ
// 1 文字分の幅を狭めて全文を画面内に収める。フォントサイズ自体は変えず、
// 実車内 LCD のように「字を縦に長く・横に詰めて」表示することで、長い駅名でも
// 高さを保ったまま読ませる演出を実現する。
export const calcStationNameScaleX = (
  text: string,
  widthRatio = 0.6,
  baseFontSize: number = STATION_NAME_FONT_SIZE
) => {
  if (!text) {
    return 1;
  }
  const availableWidth = Dimensions.get('window').width * widthRatio;
  const requiredFontSize = availableWidth / (text.length * CHAR_WIDTH_RATIO);
  const scaleX = requiredFontSize / baseFontSize;
  return Math.min(1, Math.max(scaleX, MIN_SCALE_FLOOR));
};
