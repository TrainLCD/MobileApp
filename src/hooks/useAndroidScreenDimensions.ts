import { useEffect, useState } from 'react';
import { Dimensions, Platform, type ScaledSize } from 'react-native';

export const useAndroidScreenDimensions = () => {
  const [screen, setScreen] = useState(() =>
    Platform.OS === 'android' ? Dimensions.get('screen') : undefined
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // windowが変わらないディスプレイ遷移も走行画面の判定に反映する。
    const subscription = Dimensions.addEventListener(
      'change',
      ({ screen }: { screen: ScaledSize }) => {
        setScreen(screen);
      }
    );
    // 初回描画から購読開始までに発生した変更も取得する。
    setScreen(Dimensions.get('screen'));
    return () => subscription.remove();
  }, []);

  return screen;
};
