import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Typography from '~/components/Typography';
import { isLEDThemeAtom } from '~/store/atoms/theme';

// 3 点ドットの位相ずらし(ms)。件数固定なのでキーにも使う
const DOT_DELAYS = [0, 150, 300] as const;
const DIM_OPACITY = 0.25;
// LED テーマはドット絵的な質感に揃えるため、補間せず 2 段階で点滅させる
const LED_STEP_DURATION = 0;
const FADE_DURATION = 400;
const LED_HOLD_DURATION = 400;

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  bg: {
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0px 0px 8px rgba(51, 51, 51, 0.25)',
  },
  ledBg: {
    backgroundColor: '#212121',
    borderColor: '#fff',
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
  },
  label: {
    fontSize: 14,
    // ドット群と文言が詰まって見えないよう、root の gap 6 に少し足す
    marginLeft: 2,
  },
  labelColor: {
    color: '#737373',
  },
  labelLEDColor: {
    color: '#ccc',
  },
});

const Dot = ({ delay, isLEDTheme }: { delay: number; isLEDTheme: boolean }) => {
  const opacity = useSharedValue(DIM_OPACITY);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        isLEDTheme
          ? withSequence(
              withTiming(1, { duration: LED_STEP_DURATION }),
              withDelay(
                LED_HOLD_DURATION,
                withTiming(DIM_OPACITY, { duration: LED_STEP_DURATION })
              ),
              withDelay(
                LED_HOLD_DURATION,
                withTiming(1, { duration: LED_STEP_DURATION })
              )
            )
          : withSequence(
              withTiming(1, { duration: FADE_DURATION }),
              withTiming(DIM_OPACITY, { duration: FADE_DURATION })
            ),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(opacity);
    };
  }, [delay, isLEDTheme, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: isLEDTheme ? '#fff' : '#333',
          borderRadius: isLEDTheme ? 0 : 4,
        },
        animatedStyle,
      ]}
    />
  );
};

// 送信中に表示するタイピングインジケータ。アシスタントバブルと同じ器に 3 点ドットを出す。
// label を渡すとドットの右に補助文言(ツール実行中の「駅を検索しています…」等)を並べる。
export const AgentTypingIndicator = ({ label }: { label?: string }) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <View style={[styles.root, isLEDTheme ? styles.ledBg : styles.bg]}>
      {DOT_DELAYS.map((delay) => (
        <Dot
          key={`agent-typing-dot-${delay}`}
          delay={delay}
          isLEDTheme={isLEDTheme}
        />
      ))}
      {label ? (
        <Typography
          style={[
            styles.label,
            isLEDTheme ? styles.labelLEDColor : styles.labelColor,
          ]}
        >
          {label}
        </Typography>
      ) : null}
    </View>
  );
};
