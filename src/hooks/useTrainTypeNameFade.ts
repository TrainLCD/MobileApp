import { useEffect, useRef, useState } from 'react';
import { Easing, Animated as RNAnimated } from 'react-native';

export function useTrainTypeNameFade(
  trainTypeName: string | undefined,
  headerTransitionDelay: number
) {
  const textOpacityAnim = useRef(new RNAnimated.Value(0)).current;
  // 再描画中も消える側の種別名はフェード完了まで保持する。
  const [prevTrainTypeName, setPrevTrainTypeName] = useState(trainTypeName);

  useEffect(() => {
    textOpacityAnim.setValue(0);
    if (trainTypeName === prevTrainTypeName) return;
    RNAnimated.timing(textOpacityAnim, {
      toValue: 1,
      duration: headerTransitionDelay,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setPrevTrainTypeName(trainTypeName);
    });
    return () => textOpacityAnim.stopAnimation();
  }, [
    headerTransitionDelay,
    prevTrainTypeName,
    textOpacityAnim,
    trainTypeName,
  ]);

  return { prevTrainTypeName, textOpacityAnim };
}
