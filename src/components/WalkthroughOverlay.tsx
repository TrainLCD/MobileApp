import { Portal } from '@gorhom/portal';
import React, { useEffect, useId } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { translate } from '../translation';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

export type SpotlightArea = {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
};

export type WalkthroughStepId =
  | 'welcome'
  | 'changeLocation'
  | 'savedRoutes'
  | 'selectLine'
  | 'customize'
  | 'routeSearchIntro'
  | 'routeSearchBar'
  | 'routeSearchResults';

export type WalkthroughStep = {
  id: WalkthroughStepId;
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
  onGoToStep: (index: number) => void;
  onSkip: () => void;
};

const ANIMATION_DURATION = 300;

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
    maxWidth: 640,
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
});

const WalkthroughOverlay: React.FC<Props> = ({
  visible,
  step,
  currentStepIndex,
  totalSteps,
  onNext,
  onGoToStep,
  onSkip,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const maskId = useId();

  const { spotlightArea, tooltipPosition = 'bottom' } = step;

  // tooltipPosition === 'top' かつ spotlightArea がある場合は bottom で配置
  const useBottomPositioning =
    tooltipPosition === 'top' && spotlightArea !== undefined;

  // ツールチップのY座標を計算（画面上端からの距離）
  const calculateTooltipY = (): number => {
    if (tooltipPosition === 'top' && !spotlightArea) {
      return insets.top + 60;
    }
    if (tooltipPosition === 'bottom' && spotlightArea) {
      return spotlightArea.y + spotlightArea.height + 20;
    }
    if (useBottomPositioning && spotlightArea) {
      // bottomからの距離をtopに変換（推定高さ200pxを使用）
      const estimatedModalHeight = 200;
      return spotlightArea.y - estimatedModalHeight - 20;
    }
    // デフォルト: 画面下部
    return screenHeight - insets.bottom - 300;
  };

  // アニメーション用のshared value
  const animatedY = useSharedValue(calculateTooltipY());

  // ステップが変わったときに位置をアニメーション
  // biome-ignore lint/correctness/useExhaustiveDependencies: 位置変更時にアニメーションをトリガーする
  useEffect(() => {
    const targetY = calculateTooltipY();
    animatedY.value = withTiming(targetY, { duration: ANIMATION_DURATION });
  }, [currentStepIndex, spotlightArea?.y, screenHeight]);

  // タブレットで中央揃えになるよう左位置を計算
  const tooltipWidth = Math.min(Math.max(0, screenWidth - 48), 640);
  const tooltipLeft = (screenWidth - tooltipWidth) / 2;

  const animatedTooltipStyle = useAnimatedStyle(
    () => ({
      top: animatedY.value,
      left: tooltipLeft,
      width: tooltipWidth,
    }),
    [tooltipLeft, tooltipWidth]
  );

  if (!visible) {
    return null;
  }

  return (
    <Portal>
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable style={styles.pressableOverlay} onPress={onNext}>
          <Svg width={screenWidth} height={screenHeight}>
            <Defs>
              <Mask id={maskId}>
                <Rect
                  x="0"
                  y="0"
                  width={screenWidth}
                  height={screenHeight}
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
              width={screenWidth}
              height={screenHeight}
              fill="rgba(0, 0, 0, 0.7)"
              mask={`url(#${maskId})`}
            />
          </Svg>
        </Pressable>

        <Animated.View style={[styles.tooltipContainer, animatedTooltipStyle]}>
          <Typography style={styles.title}>
            {translate(step.titleKey)}
          </Typography>
          <Typography style={styles.description}>
            {translate(step.descriptionKey)}
          </Typography>

          <View style={styles.footer}>
            <Pressable
              onPress={onSkip}
              accessibilityRole="button"
              accessibilityLabel={translate('walkthroughSkip')}
              accessibilityHint={translate('walkthroughSkipHint')}
            >
              <Typography style={styles.skipText}>
                {translate('walkthroughSkip')}
              </Typography>
            </Pressable>

            <View style={styles.pagination}>
              {Array.from({ length: totalSteps }).map((_, index) => (
                <Pressable
                  key={`dot-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable array
                    index
                  }`}
                  onPress={() => onGoToStep(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${index + 1} / ${totalSteps}`}
                  accessibilityHint={translate('walkthroughGoToStepHint')}
                >
                  <View
                    style={[
                      styles.dot,
                      index === currentStepIndex && styles.dotActive,
                    ]}
                  />
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.nextButton}
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel={
                currentStepIndex === totalSteps - 1
                  ? translate('walkthroughStart')
                  : translate('walkthroughNext')
              }
              accessibilityHint={translate('walkthroughNextHint')}
            >
              <Typography style={styles.nextButtonText}>
                {currentStepIndex === totalSteps - 1
                  ? translate('walkthroughStart')
                  : translate('walkthroughNext')}
              </Typography>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
};

export default React.memo(WalkthroughOverlay);
