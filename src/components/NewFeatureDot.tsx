import type React from 'react';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  color: string;
  /** ドットの直径。既定は設定リスト用の 12px */
  size?: number;
  /** リングを広げるか。フッタータブなど道しるべ側は静止させる */
  pulse?: boolean;
};

export const NEW_FEATURE_DOT_SIZE = 12;
/** フッタータブのアイコンに載せる方は小さくする */
export const NEW_FEATURE_DOT_SIZE_SMALL = 8;

const PULSE_DURATION = 2400;
// 画面が出ている間は止めない。数周期で止めると、設定を開いてスクロールしている
// 間にパルスが終わってしまい、以降はただの点になって印の役目を果たさない。
// この印は外観画面を一度開くか機能をオンにした時点で出なくなるので、
// 出続けること自体が催促にはならない。
const PULSE_REPEAT = -1;
const RING_MAX_SCALE = 2.8;
const RING_START_OPACITY = 0.55;
// 1周期のうちリングが広がりきるまでの割合。残りは次の波までの休み
const RING_ACTIVE_RATIO = 0.7;

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    ...StyleSheet.absoluteFill,
  },
});

/**
 * 新機能の在り処を示す印。地の色を足さずに視線だけ拾うため、
 * アクセント色のドットからリングが広がって消える表現にしている。
 * OS の「アニメーションを減らす」が有効なときは静止ドットになる。
 */
const NewFeatureDot: React.FC<Props> = ({
  color,
  size = NEW_FEATURE_DOT_SIZE,
  pulse = true,
}: Props) => {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const animated = pulse && !reducedMotion;

  useEffect(() => {
    if (!animated) {
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: PULSE_DURATION,
        easing: Easing.out(Easing.ease),
      }),
      PULSE_REPEAT,
      false
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [animated, progress]);

  const ringStyle = useAnimatedStyle(() => {
    const eased = Math.min(progress.value / RING_ACTIVE_RATIO, 1);
    return {
      transform: [{ scale: 1 + (RING_MAX_SCALE - 1) * eased }],
      opacity: RING_START_OPACITY * (1 - eased),
    };
  });

  const dotStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  };

  return (
    <View
      style={[styles.root, { width: size, height: size }]}
      pointerEvents="none"
    >
      {animated ? (
        <Animated.View style={[styles.ring, dotStyle, ringStyle]} />
      ) : null}
      <View style={dotStyle} />
    </View>
  );
};

export default memo(NewFeatureDot);
