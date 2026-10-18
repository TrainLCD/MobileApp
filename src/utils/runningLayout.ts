export const getRunningLayout = (
  width: number,
  height: number,
  portraitEnabled: boolean
): 'square' | 'portrait' | 'landscape' => {
  // 正方形と、その前後20%までを同じ情報設計で扱う。向きには依存させない。
  // OSバーで少し縦横比が変わっても、短い画面に横長LCDを押し込まない。
  if (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    Math.min(width, height) > 0 &&
    Math.max(width, height) / Math.min(width, height) <= 1.2
  ) {
    return 'square';
  }
  return portraitEnabled && height > width ? 'portrait' : 'landscape';
};
