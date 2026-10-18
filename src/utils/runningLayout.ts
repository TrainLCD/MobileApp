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
  // Androidのカバー画面はシステムバーや切欠きでwindowの比率が変わる。
  // #7234のwindow判定に加え、装飾領域を含む現在のscreenも判定する。
  if (
    isSquare(width, height) ||
    (screen && isSquare(screen.width, screen.height))
  ) {
    return 'square';
  }
  return portraitEnabled && height > width ? 'portrait' : 'landscape';
};
