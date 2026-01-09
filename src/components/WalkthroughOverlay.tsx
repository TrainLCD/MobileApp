import { Portal } from '@gorhom/portal';
import React, { useCallback, useId } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { translate } from '../translation';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SWIPE_THRESHOLD = 50;

export type SpotlightArea = {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
};

export type WalkthroughStep = {
  spotlightArea?: SpotlightArea;
  titleKey: string;
  descriptionKey: string;
  tooltipPosition?: 'top' | 'bottom';
};

type Props = {
  visible: boolean;
  step: WalkthroughStep;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  pressableOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  tooltipContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#03a9f4',
    marginBottom: 8,
    lineHeight: Platform.select({
      ios: RFValue(24),
    }),
  },
  description: {
    fontSize: RFValue(14),
    color: '#333',
    lineHeight: Platform.select({
      ios: RFValue(20),
      android: RFValue(22),
    }),
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: RFValue(14),
    color: '#666',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#03a9f4',
  },
  nextButton: {
    backgroundColor: '#03a9f4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  nextButtonText: {
    fontSize: RFValue(14),
    color: '#fff',
    fontWeight: 'bold',
  },
  swipeHint: {
    fontSize: RFValue(12),
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});

const WalkthroughOverlay: React.FC<Props> = ({
  visible,
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}) => {
  const insets = useSafeAreaInsets();
  const maskId = useId();
  const translateX = useSharedValue(0);

  const handleSwipeLeft = useCallback(() => {
    onNext();
  }, [onNext]);

  const handleSwipeRight = useCallback(() => {
    onPrev();
  }, [onPrev]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(handleSwipeLeft)();
      } else if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(handleSwipeRight)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 0.3 }],
  }));

  if (!visible) {
    return null;
  }

  const { spotlightArea, tooltipPosition = 'bottom' } = step;

  const tooltipTop =
    tooltipPosition === 'top'
      ? insets.top + 60
      : spotlightArea
        ? spotlightArea.y + spotlightArea.height + 20
        : SCREEN_HEIGHT / 2;

  const tooltipBottom =
    tooltipPosition === 'bottom' && !spotlightArea
      ? insets.bottom + 100
      : undefined;

  return (
    <Portal>
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable style={styles.pressableOverlay} onPress={onNext}>
          <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
            <Defs>
              <Mask id={maskId}>
                <Rect
                  x="0"
                  y="0"
                  width={SCREEN_WIDTH}
                  height={SCREEN_HEIGHT}
                  fill="white"
                />
                {spotlightArea && (
                  <Rect
                    x={spotlightArea.x}
                    y={spotlightArea.y}
                    width={spotlightArea.width}
                    height={spotlightArea.height}
                    rx={spotlightArea.borderRadius ?? 8}
                    ry={spotlightArea.borderRadius ?? 8}
                    fill="black"
                  />
                )}
              </Mask>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              fill="rgba(0, 0, 0, 0.7)"
              mask={`url(#${maskId})`}
            />
          </Svg>
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.tooltipContainer,
              tooltipBottom !== undefined
                ? { bottom: tooltipBottom }
                : { top: tooltipTop },
              animatedStyle,
            ]}
          >
            <Typography style={styles.title}>
              {translate(step.titleKey)}
            </Typography>
            <Typography style={styles.description}>
              {translate(step.descriptionKey)}
            </Typography>

            <View style={styles.footer}>
              <Pressable onPress={onSkip}>
                <Typography style={styles.skipText}>
                  {translate('walkthroughSkip')}
                </Typography>
              </Pressable>

              <View style={styles.pagination}>
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <View
                    key={`dot-${
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable array
                      index
                    }`}
                    style={[
                      styles.dot,
                      index === currentStepIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>

              <Pressable style={styles.nextButton} onPress={onNext}>
                <Typography style={styles.nextButtonText}>
                  {currentStepIndex === totalSteps - 1
                    ? translate('walkthroughStart')
                    : translate('walkthroughNext')}
                </Typography>
              </Pressable>
            </View>

            <Typography style={styles.swipeHint}>
              {translate('walkthroughSwipeHint')}
            </Typography>
          </Animated.View>
        </GestureDetector>
      </View>
    </Portal>
  );
};

export default React.memo(WalkthroughOverlay);
