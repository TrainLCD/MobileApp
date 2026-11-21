import { useCallback, useState } from 'react';
import { type LayoutChangeEvent, Platform } from 'react-native';
import isTablet from '~/utils/isTablet';

/** 路線図と矢印で共有する下余白。画面全体ではなくヘッダー下の領域に収める。 */
export const useBoardLayout = (windowHeight: number) => {
  const fitBelowHeader = isTablet && Platform.OS === 'android';
  const [boardHeight, setBoardHeight] = useState(0);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setBoardHeight(event.nativeEvent.layout.height);
  }, []);

  // 従来の画面高 / 3.5 では、ヘッダーが高いほど駅名の領域が不足する。
  // Androidタブレットはヘッダーを除いた実測高を使う。端末別のセルの
  // bottomオフセットは各テーマ側で維持し、矢印にも同じ下余白を渡す。
  const boardPaddingBottom = isTablet
    ? (fitBelowHeader ? boardHeight : windowHeight) / 3.5
    : undefined;

  return {
    boardPaddingBottom,
    onBoardLayout: fitBelowHeader ? handleLayout : undefined,
  };
};
