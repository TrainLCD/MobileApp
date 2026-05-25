import { useWindowDimensions } from 'react-native';

// Main 画面は常に横長レイアウト前提だが、端末側の回転ロック ON 等で物理的に
// portrait のままだと useWindowDimensions が縦寸を返してしまい、Main 配下の
// レイアウトが画面いっぱいに広がらない。長辺を width / 短辺を height として返す
// ことで、Main.tsx 側の 90deg 回転ラッパーと矛盾しないサイズを子に渡す。
export const useLandscapeWindowDimensions = () => {
  const { width, height } = useWindowDimensions();
  return {
    width: Math.max(width, height),
    height: Math.min(width, height),
  };
};
