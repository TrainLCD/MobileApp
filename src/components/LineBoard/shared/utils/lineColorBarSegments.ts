import {
  commonLineBoardStyles,
  ROUND_LINE_DOT_SIZE,
} from '../styles/commonStyles';

type LineColor = string | null | undefined;

/**
 * 駅の枠の左端から LineDot の中心までの距離。ドットは枠の左端に置かれる
 * @param round 丸いドット(小田急風・E131系風)なら true
 */
export const getLineDotCenterX = (round: boolean): number =>
  (round ? ROUND_LINE_DOT_SIZE : commonLineBoardStyles.chevronGradient.width) /
  2;

export type LineColorBarSegment = {
  left: number;
  width: number;
  color: LineColor;
};

/**
 * 駅の枠の線のうち路線の色で塗る範囲を、色を切り替える位置で分ける。
 * 接続駅は到着する側の路線の駅として並ぶ(dropEitherJunctionStation)ため、
 * 駅 index に着く区間は lineColors[index]、駅 index を出る区間は
 * lineColors[index + 1] の色になる。実物と同じく接続駅の LineDot の中心で色が変わる。
 * 2 本は重ねずに並べる(半透明のグラデーションなので重ねると下の色が透ける)
 * @param left 路線の色で塗る範囲の左端(駅の枠の座標)
 * @param width 路線の色で塗る範囲の幅
 * @param splitX 色を切り替える位置(駅の枠の座標)。通常は LineDot の中心。
 *   到着中の駅で灰色の部分がドットまでを表すときは、塗る範囲の左端を渡す
 * @param lineColors LineBoard に並ぶ駅の路線の色
 * @param arrivingLineColor 先頭の駅に着いた区間の路線の色。接続駅に着いた後は先頭の駅が
 *   次の路線の駅に差し替わるので、先頭の枠のドットより手前はこの色で塗る
 * @param index 駅の枠の位置
 * @returns 左から順に塗る範囲。色が変わらなければ 1 本
 */
export const getLineColorBarSegments = ({
  left,
  width,
  splitX,
  lineColors,
  arrivingLineColor,
  index,
}: {
  left: number;
  width: number;
  splitX: number;
  lineColors: LineColor[];
  arrivingLineColor?: LineColor;
  index: number;
}): LineColorBarSegment[] => {
  const color =
    index === 0 && arrivingLineColor ? arrivingLineColor : lineColors[index];
  // 最後の枠の先の駅は LineBoard に並ばないので、その駅の色のまま塗る
  const nextColor =
    index + 1 < lineColors.length ? lineColors[index + 1] : lineColors[index];
  const right = left + width;

  if (nextColor === color || right <= splitX) {
    return [{ left, width, color }];
  }
  if (left >= splitX) {
    return [{ left, width, color: nextColor }];
  }
  return [
    { left, width: splitX - left, color },
    { left: splitX, width: right - splitX, color: nextColor },
  ];
};
