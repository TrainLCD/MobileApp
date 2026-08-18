export type RoundedRectPathParams = {
  x: number;
  y: number;
  width: number;
  height: number;
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

/**
 * 隅ごとに半径の異なる角丸矩形の SVG パスを生成する。
 * SVG の `<Rect rx ry>` は4隅共通の半径しか表現できないため、
 * 上辺だけ直角のカードなど対象要素の形へ追従させるにはパスが必要になる。
 */
export const buildRoundedRectPath = ({
  x,
  y,
  width,
  height,
  topLeft,
  topRight,
  bottomRight,
  bottomLeft,
}: RoundedRectPathParams): string => {
  // 半径が矩形からはみ出さないよう短辺の半分で頭打ちにする
  const maxRadius = Math.max(Math.min(width, height) / 2, 0);
  const clamp = (radius: number) =>
    Math.min(Math.max(Number.isFinite(radius) ? radius : 0, 0), maxRadius);

  const tl = clamp(topLeft);
  const tr = clamp(topRight);
  const br = clamp(bottomRight);
  const bl = clamp(bottomLeft);

  const right = x + width;
  const bottom = y + height;

  // 半径0の円弧は SVG 仕様上「直線」として扱われるため、直角の隅も同じ形で書ける
  return [
    `M ${x + tl} ${y}`,
    `H ${right - tr}`,
    `A ${tr} ${tr} 0 0 1 ${right} ${y + tr}`,
    `V ${bottom - br}`,
    `A ${br} ${br} 0 0 1 ${right - br} ${bottom}`,
    `H ${x + bl}`,
    `A ${bl} ${bl} 0 0 1 ${x} ${bottom - bl}`,
    `V ${y + tl}`,
    `A ${tl} ${tl} 0 0 1 ${x + tl} ${y}`,
    'Z',
  ].join(' ');
};
