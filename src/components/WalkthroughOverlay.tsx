import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  Animated as RNAnimated,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
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
  | 'routeSearch'
  | 'customize'
  | 'routeSearchIntro'
  | 'routeSearchBar'
  | 'routeSearchAgentBanner'
  | 'routeSearchResults'
  | 'settingsWelcome'
  | 'settingsTheme'
  | 'settingsTts'
  | 'settingsLanguages';

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
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.3)',
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
  const overlayRef = useRef<View>(null);
  const [overlayOffset, setOverlayOffset] = useState({ x: 0, y: 0 });

  const { spotlightArea, tooltipPosition = 'bottom' } = step;
  // spotlightArea は measureInWindow() 由来の画面全体を基準にした座標。
  // WalkthroughOverlay は共通ダイアログより手前に出ないよう Portal ではなく通常ツリー内に描画しているため、
  // SVG とツールチップの座標基準はオーバーレイ自身の左上になる。
  // そのまま使うとスポットライトがずれるので、オーバーレイの画面上の原点を差し引いてローカル座標へ変換する。
  const adjustedSpotlightArea = useMemo(() => {
    if (!spotlightArea) {
      return undefined;
    }
    return {
      ...spotlightArea,
      x: spotlightArea.x - overlayOffset.x,
      y: spotlightArea.y - overlayOffset.y,
    };
  }, [overlayOffset.x, overlayOffset.y, spotlightArea]);

  // tooltipPosition === 'top' かつ spotlightArea がある場合は bottom で配置
  const useBottomPositioning =
    tooltipPosition === 'top' && adjustedSpotlightArea !== undefined;

  // ツールチップのY座標を計算（画面上端からの距離）
  const calculateTooltipY = (): number => {
    if (tooltipPosition === 'top' && !adjustedSpotlightArea) {
      return insets.top + 60;
    }
    if (tooltipPosition === 'bottom' && adjustedSpotlightArea) {
      return adjustedSpotlightArea.y + adjustedSpotlightArea.height + 20;
    }
    if (useBottomPositioning && adjustedSpotlightArea) {
      // bottomからの距離をtopに変換（推定高さ200pxを使用）
      const estimatedModalHeight = 200;
      return adjustedSpotlightArea.y - estimatedModalHeight - 20;
    }
    // デフォルト: 画面下部
    return screenHeight - insets.bottom - 300;
  };

  // アニメーション用のshared value
  const animatedY = useRef(new RNAnimated.Value(calculateTooltipY())).current;

  // ステップが変わったときに位置をアニメーション
  // biome-ignore lint/correctness/useExhaustiveDependencies: 位置変更時にアニメーションをトリガーする
  useEffect(() => {
    const targetY = calculateTooltipY();
    RNAnimated.timing(animatedY, {
      toValue: targetY,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, [currentStepIndex, adjustedSpotlightArea?.y, screenHeight]);

  // 通常ツリー内に描画したオーバーレイの画面上の原点を測り、
  // measureInWindow() で取得したスポットライト座標をローカル座標へ補正できるようにする。
  const handleOverlayLayout = () => {
    overlayRef.current?.measureInWindow((x, y) => {
      setOverlayOffset((prev) =>
        prev.x === x && prev.y === y ? prev : { x, y }
      );
    });
  };

  // タブレットで中央揃えになるよう左位置を計算
  const tooltipWidth = Math.min(Math.max(0, screenWidth - 48), 640);
  const tooltipLeft = (screenWidth - tooltipWidth) / 2;

  const animatedTooltipStyle = useMemo(
    () => ({
      top: animatedY,
      left: tooltipLeft,
      width: tooltipWidth,
    }),
    [animatedY, tooltipLeft, tooltipWidth]
  );

  if (!visible) {
    return null;
  }

  return (
    <View
      ref={overlayRef}
      style={styles.overlay}
      pointerEvents="box-none"
      onLayout={handleOverlayLayout}
    >
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
              {adjustedSpotlightArea && (
                <Rect
                  x={adjustedSpotlightArea.x}
                  y={adjustedSpotlightArea.y}
                  width={adjustedSpotlightArea.width}
                  height={adjustedSpotlightArea.height}
                  rx={adjustedSpotlightArea.borderRadius ?? 8}
                  ry={adjustedSpotlightArea.borderRadius ?? 8}
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

      <RNAnimated.View style={[styles.tooltipContainer, animatedTooltipStyle]}>
        <Typography style={styles.title}>{translate(step.titleKey)}</Typography>
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
      </RNAnimated.View>
    </View>
  );
};

export default React.memo(WalkthroughOverlay);
