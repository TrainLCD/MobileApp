import { useMemo } from 'react';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { LOW_POWER_BASE_HEIGHT } from '../constants';
import { useLandscapeSafeAreaInsets } from './useLandscapeSafeAreaInsets';
import { useLandscapeWindowDimensions } from './useLandscapeWindowDimensions';

export type LowPowerLayout = {
  /** セーフエリアを除いた描画領域の長辺 */
  width: number;
  /** セーフエリアを除いた描画領域の短辺 */
  height: number;
  /** 設計基準(720x360dp)に対する拡大率 */
  scale: number;
  /** 横長座標系へ読み替え済みのセーフエリア余白 */
  insets: EdgeInsets;
};

/**
 * ライトウェイト(コードネーム: 低消費電力)テーマの寸法計算の基準。
 *
 * ノッチやホームインジケータを避けた実効の描画領域を返す。拡大率をそこから
 * 起こすことで、セーフエリアが広い端末でもレイアウトが画面外へはみ出さない。
 * ヘッダーと停車駅ストリップで拡大率がずれないよう、両者はこのフックを共有する。
 */
export const useLowPowerLayout = (): LowPowerLayout => {
  const dim = useLandscapeWindowDimensions();
  const insets = useLandscapeSafeAreaInsets();

  return useMemo(() => {
    const width = dim.width - insets.left - insets.right;
    const height = dim.height - insets.top - insets.bottom;
    return { width, height, scale: height / LOW_POWER_BASE_HEIGHT, insets };
  }, [dim.width, dim.height, insets]);
};
