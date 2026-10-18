const isSquare = (width: number, height: number): boolean =>
  Number.isFinite(width) &&
  Number.isFinite(height) &&
  Math.min(width, height) > 0 &&
  Math.max(width, height) / Math.min(width, height) <= 1.2;

export const getRunningLayout = (
  width: number,
  height: number,
  portraitEnabled: boolean,
  screen?: { width: number; height: number }
): 'square' | 'portrait' | 'landscape' => {
  // 正方形と、その前後20%までを同じ情報設計で扱う。向きには依存させない。
  // #7234のscreen補正は、各辺で画面の70%以上を使うwindowに限定する。
  // 360×374から360×280への縮小を許容し、半画面への縮小は補正しない。
  // これは装飾領域の上限を定めるUI上の方針で、OSの分割画面判定ではない。
  if (
    isSquare(width, height) ||
    (screen &&
      isSquare(screen.width, screen.height) &&
      width >= screen.width * 0.7 &&
      width <= screen.width &&
      height >= screen.height * 0.7 &&
      height <= screen.height)
  ) {
    return 'square';
  }
  return portraitEnabled && height > width ? 'portrait' : 'landscape';
};
