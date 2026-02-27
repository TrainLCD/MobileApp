import { useEffect, useMemo, useRef, useState } from 'react';
import { Easing, Animated as RNAnimated } from 'react-native';
import type { Station } from '~/@types/graphql';
import type { HeaderAnimationState } from '../components/Header.types';
import type { HeaderTransitionState } from '../models/HeaderTransitionState';
import { useLazyPrevious } from './useLazyPrevious';

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
  const [previousTexts, setPreviousTexts] = useState(() => ({
    stationText,
    stateText,
    stateTextRight,
    boundText,
    connectionText,
    isJapaneseState,
  }));
  const progress = useRef(new RNAnimated.Value(1)).current;
  const boundProgress = useRef(new RNAnimated.Value(1)).current;

  // Previous value tracking
  const prevHeaderState = useLazyPrevious(headerState, fadeOutFinished);
  const prevBoundIsDifferent = previousTexts.boundText !== boundText;

  const hasHeaderContentChanged = useMemo(
    () =>
      previousTexts.stationText !== stationText ||
      previousTexts.stateText !== stateText ||
      previousTexts.stateTextRight !== stateTextRight ||
      previousTexts.boundText !== boundText ||
      previousTexts.connectionText !== connectionText ||
      previousTexts.isJapaneseState !== isJapaneseState,
    [
      boundText,
      connectionText,
      isJapaneseState,
      previousTexts,
      stationText,
      stateText,
      stateTextRight,
    ]
  );

  useEffect(() => {
    if (!selectedBound) {
      progress.stopAnimation();
      boundProgress.stopAnimation();
      progress.setValue(1);
      boundProgress.setValue(1);
      setPreviousTexts({
        stationText,
        stateText,
        stateTextRight,
        boundText,
        connectionText,
        isJapaneseState,
      });
      setFadeOutFinished(true);
      return;
    }

    if (
      prevHeaderState === headerState &&
      !hasHeaderContentChanged &&
      !prevBoundIsDifferent
    ) {
      setFadeOutFinished(true);
      return;
    }

    setFadeOutFinished(false);

    progress.stopAnimation();
    progress.setValue(0);
    RNAnimated.timing(progress, {
      toValue: 1,
      duration: headerTransitionDelay,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setPreviousTexts({
          stationText,
          stateText,
          stateTextRight,
          boundText,
          connectionText,
          isJapaneseState,
        });
        setFadeOutFinished(true);
      }
    });

    if (!prevBoundIsDifferent) {
      boundProgress.stopAnimation();
      boundProgress.setValue(1);
      return;
    }

    boundProgress.stopAnimation();
    boundProgress.setValue(0);
    RNAnimated.timing(boundProgress, {
      toValue: 1,
      duration: headerTransitionDelay,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [
    boundProgress,
    hasHeaderContentChanged,
    headerTransitionDelay,
    headerState,
    isJapaneseState,
    boundText,
    connectionText,
    prevBoundIsDifferent,
    prevHeaderState,
    progress,
    stateText,
    stateTextRight,
    stationText,
    selectedBound,
  ]);

  const inverseProgress = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
    [progress]
  );

  const inverseBoundProgress = useMemo(
    () =>
      boundProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
    [boundProgress]
  );

  const stateTopAnimatedStyles = useMemo(
    () => ({
      opacity: progress,
    }),
    [progress]
  );

  const stateBottomAnimatedStyles = useMemo(
    () => ({
      opacity: inverseProgress,
    }),
    [inverseProgress]
  );

  const stateTopAnimatedStylesRight = useMemo(
    () => ({
      opacity: progress,
    }),
    [progress]
  );

  const stateBottomAnimatedStylesRight = useMemo(
    () => ({
      opacity: inverseProgress,
    }),
    [inverseProgress]
  );

  const topNameAnimatedAnchorStyle = useMemo(
    () => ({
      transform: [{ scaleY: progress }],
    }),
    [progress]
  );

  const bottomNameAnimatedAnchorStyle = useMemo(
    () => ({
      transform: [{ scaleY: inverseProgress }],
    }),
    [inverseProgress]
  );

  const topNameAnimatedStyles = useMemo(
    () => ({
      opacity: progress,
    }),
    [progress]
  );

  const bottomNameAnimatedStyles = useMemo(
    () => ({
      opacity: inverseProgress,
    }),
    [inverseProgress]
  );

  const boundTopAnimatedStyles = useMemo(
    () => ({
      opacity: boundProgress,
    }),
    [boundProgress]
  );

  const boundBottomAnimatedStyles = useMemo(
    () => ({
      opacity: inverseBoundProgress,
    }),
    [inverseBoundProgress]
  );

  return {
    prevStationText: previousTexts.stationText,
    prevStateText: previousTexts.stateText,
    prevStateTextRight: previousTexts.stateTextRight,
    prevBoundText: previousTexts.boundText,
    prevConnectionText: previousTexts.connectionText,
    prevIsJapaneseState: previousTexts.isJapaneseState,
    stateTopAnimatedStyles,
    stateBottomAnimatedStyles,
    stateTopAnimatedStylesRight,
    stateBottomAnimatedStylesRight,
    topNameAnimatedAnchorStyle,
    bottomNameAnimatedAnchorStyle,
    topNameAnimatedStyles,
    bottomNameAnimatedStyles,
    boundTopAnimatedStyles,
    boundBottomAnimatedStyles,
  };
};
