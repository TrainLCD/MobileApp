import { useMemo } from 'react';
import {
  type EdgeInsets,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useLandscapeWindowDimensions } from './useLandscapeWindowDimensions';

/**
 * 実機のセーフエリア余白を、Main 画面の横長レイアウト座標系へ読み替える。
 *
 * 端末が物理的に portrait のとき、コンテンツは 90deg 回転して描画される。
 * 回転後は辺の対応がずれる(コンテンツの左端は実機の上端、上端は実機の右端)。
 */
export const getLandscapeSafeAreaInsets = (
  insets: EdgeInsets,
  isPortrait: boolean
): EdgeInsets =>
  isPortrait
    ? {
        top: insets.right,
        right: insets.bottom,
        bottom: insets.left,
        left: insets.top,
      }
    : insets;

/**
 * Main 画面の横長レイアウト座標系に合わせたセーフエリア余白を返す。
 *
 * useSafeAreaInsets() の値をそのまま padding に使うと、90deg 回転しているとき
 * ノッチやホームインジケータを避けきれない。回転量に合わせて辺を入れ替える。
 */
export const useLandscapeSafeAreaInsets = (): EdgeInsets => {
  const insets = useSafeAreaInsets();
  const { isPortrait } = useLandscapeWindowDimensions();

  return useMemo(
    () => getLandscapeSafeAreaInsets(insets, isPortrait),
    [insets, isPortrait]
  );
};
