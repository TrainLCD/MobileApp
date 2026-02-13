import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { LinearGradient, Path, Polygon, Stop, Svg } from 'react-native-svg';

type Props = {
  backgroundScaleSV?: SharedValue<number>;
  arrived: boolean;
};

const localStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});

export const ChevronYamanote = ({ backgroundScaleSV, arrived }: Props) => {
  const id = useId();

  // 赤い塗り部分だけを拡縮するアニメーションスタイル
  const fillScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backgroundScaleSV?.value ?? 1 }],
  }));

  if (!arrived) {
    return (
      <Svg viewBox="0 0 393 296" width="100%" height="100%">
        <Polygon
          fill="#bc2a2e"
          points="4 129.04 196.5 4.76 389 129.04 389 287.94 197.01 142.14 4 287.96 4 129.04"
        />
        <Path
          fill="#fff"
          d="M196.5,9.52,385,131.21V279.88L201.84,140.78,197,137.12l-4.83,3.65L8,279.93V131.21L196.5,9.52m0-9.52L0,126.86V296L197,147.15,393,296V126.86L196.5,0Z"
        />
      </Svg>
    );
  }

  return (
    <View style={localStyles.container}>
      {/* 静的な白背景 */}
      <Svg
        viewBox="0 0 393.2 296"
        width="100%"
        height="100%"
        style={localStyles.fill}
      >
        <Path fill="#fff" d="M268 4H4v288h264l120-144z" />
      </Svg>
      {/* 赤い塗りだけ Animated.View で拡縮 */}
      <Animated.View style={[localStyles.fill, fillScaleStyle]}>
        <Svg viewBox="0 0 393.2 296" width="100%" height="100%">
          <LinearGradient
            id={id}
            gradientUnits="userSpaceOnUse"
            x1={4}
            y1={150}
            x2={388}
            y2={150}
            gradientTransform="matrix(1 0 0 -1 0 298)"
          >
            <Stop offset={0} stopColor="crimson" />
            <Stop offset={1} stopColor="crimson" />
          </LinearGradient>
          <Path fill={`url(#${id})`} d="M268 4H4v288h264l120-144z" />
        </Svg>
      </Animated.View>
    </View>
  );
};
