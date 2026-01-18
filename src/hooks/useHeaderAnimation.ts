import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { Station } from '~/@types/graphql';
import type { HeaderAnimationState } from '../components/Header.types';
import type { HeaderTransitionState } from '../models/HeaderTransitionState';
import { useLazyPrevious } from './useLazyPrevious';
import { usePrevious } from './usePrevious';

type UseHeaderAnimationOptions = {
  selectedBound: Station | null;
  headerState: HeaderTransitionState;
  headerTransitionDelay: number;
  stationText: string;
  stateText: string;
  stateTextRight: string;
  boundText: string;
  connectionText: string;
  isJapaneseState: boolean;
};

/**
 * Headerコンポーネントのアニメーションロジックを管理するhook
 * HeaderTokyoMetro, HeaderTY, HeaderSaikyo, HeaderJRKyushuで使用
 */
export const useHeaderAnimation = (
  options: UseHeaderAnimationOptions
): HeaderAnimationState => {
  const {
    selectedBound,
    headerState,
    headerTransitionDelay,
    stationText,
    stateText,
    stateTextRight,
    boundText,
    connectionText,
    isJapaneseState,
  } = options;

  const [fadeOutFinished, setFadeOutFinished] = useState(false);

  // SharedValues
  const nameFadeAnim = useSharedValue<number>(1);
  const topNameScaleYAnim = useSharedValue<number>(0);
  const stateOpacityAnim = useSharedValue<number>(0);
  const boundOpacityAnim = useSharedValue<number>(0);
  const bottomNameScaleYAnim = useSharedValue<number>(1);

  // Previous value tracking
  const prevHeaderState = useLazyPrevious(headerState, fadeOutFinished);
  const prevStationText = usePrevious(stationText);
  const prevStateText = usePrevious(stateText);
  const prevStateTextRight = usePrevious(stateTextRight);
  const prevBoundText = usePrevious(boundText);
  const prevConnectionText = usePrevious(connectionText);
  const prevIsJapaneseState = useLazyPrevious(isJapaneseState, fadeOutFinished);

  const prevBoundIsDifferent = useMemo(
    () => prevBoundText !== boundText,
    [boundText, prevBoundText]
  );

  const fadeIn = useCallback((): void => {
    if (!selectedBound) {
      if (prevHeaderState === headerState) {
        topNameScaleYAnim.value = 0;
        nameFadeAnim.value = 1;
        bottomNameScaleYAnim.value = 1;
        stateOpacityAnim.value = 0;
        setFadeOutFinished(true);
      }
      return;
    }

    const handleFinish = (finished: boolean | undefined) => {
      if (finished) {
        setFadeOutFinished(true);
      }
    };

    if (prevHeaderState !== headerState) {
      topNameScaleYAnim.value = withTiming(0, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      });
      nameFadeAnim.value = withTiming(
        1,
        {
          duration: headerTransitionDelay,
          easing: Easing.linear,
        },
        (finished) => runOnJS(handleFinish)(finished)
      );
      bottomNameScaleYAnim.value = withTiming(1, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      });
      stateOpacityAnim.value = withTiming(0, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      });
    }
    if (prevBoundIsDifferent) {
      boundOpacityAnim.value = withTiming(0, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      });
    }
  }, [
    bottomNameScaleYAnim,
    boundOpacityAnim,
    headerState,
    headerTransitionDelay,
    nameFadeAnim,
    prevBoundIsDifferent,
    prevHeaderState,
    selectedBound,
    stateOpacityAnim,
    topNameScaleYAnim,
  ]);

  const fadeOut = useCallback((): void => {
    if (!selectedBound) {
      return;
    }

    nameFadeAnim.value = 0;
    topNameScaleYAnim.value = 1;
    stateOpacityAnim.value = 1;
    boundOpacityAnim.value = 1;
    bottomNameScaleYAnim.value = 0;
  }, [
    selectedBound,
    nameFadeAnim,
    topNameScaleYAnim,
    stateOpacityAnim,
    boundOpacityAnim,
    bottomNameScaleYAnim,
  ]);

  const fade = useCallback(() => {
    fadeOut();
    fadeIn();
  }, [fadeIn, fadeOut]);

  useEffect(() => {
    setFadeOutFinished(!selectedBound);
    fade();
  }, [fade, selectedBound]);

  // Animated styles
  const stateTopAnimatedStyles = useAnimatedStyle(() => ({
    opacity: 1 - stateOpacityAnim.value,
  }));

  const stateBottomAnimatedStyles = useAnimatedStyle(() => ({
    opacity: stateOpacityAnim.value,
  }));

  const topNameAnimatedAnchorStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 - topNameScaleYAnim.value }],
  }));

  const bottomNameAnimatedAnchorStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: topNameScaleYAnim.value }],
  }));

  const topNameAnimatedStyles = useAnimatedStyle(() => ({
    opacity: nameFadeAnim.value,
  }));

  const bottomNameAnimatedStyles = useAnimatedStyle(() => ({
    opacity: 1 - nameFadeAnim.value,
  }));

  const boundTopAnimatedStyles = useAnimatedStyle(() => ({
    opacity: 1 - boundOpacityAnim.value,
  }));

  const boundBottomAnimatedStyles = useAnimatedStyle(() => ({
    opacity: boundOpacityAnim.value,
  }));

  return {
    prevStationText,
    prevStateText,
    prevStateTextRight,
    prevBoundText,
    prevConnectionText,
    prevIsJapaneseState,
    stateTopAnimatedStyles,
    stateBottomAnimatedStyles,
    topNameAnimatedAnchorStyle,
    bottomNameAnimatedAnchorStyle,
    topNameAnimatedStyles,
    bottomNameAnimatedStyles,
    boundTopAnimatedStyles,
    boundBottomAnimatedStyles,
  };
};
