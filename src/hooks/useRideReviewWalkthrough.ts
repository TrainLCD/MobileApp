import { useCallback, useState } from 'react';
import type {
  WalkthroughStep,
  WalkthroughStepId,
} from '../components/WalkthroughOverlay';
import { STORAGE_KEYS } from '../constants/storage';
import { storage } from '../lib/storage';

// 振り返り画面のウォークスルー(#7117)。上から順に、画面に並んでいる順で案内する
export const RIDE_REVIEW_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'rideReviewPeriod',
    titleKey: 'rideReviewWalkthroughPeriodTitle',
    descriptionKey: 'rideReviewWalkthroughPeriodDescription',
    tooltipPosition: 'bottom',
  },
  {
    id: 'rideReviewSummary',
    titleKey: 'rideReviewWalkthroughSummaryTitle',
    descriptionKey: 'rideReviewWalkthroughSummaryDescription',
    tooltipPosition: 'bottom',
  },
  {
    id: 'rideReviewRouteMap',
    titleKey: 'rideReviewWalkthroughRouteMapTitle',
    descriptionKey: 'rideReviewWalkthroughRouteMapDescription',
    tooltipPosition: 'bottom',
  },
  {
    id: 'rideReviewTopLines',
    titleKey: 'rideReviewWalkthroughTopLinesTitle',
    descriptionKey: 'rideReviewWalkthroughTopLinesDescription',
    tooltipPosition: 'bottom',
  },
];

type UseRideReviewWalkthroughResult = {
  isWalkthroughCompleted: boolean;
  isWalkthroughActive: boolean;
  currentStepIndex: number;
  currentStepId: WalkthroughStepId | null;
  currentStep: WalkthroughStep | null;
  totalSteps: number;
  nextStep: () => void;
  goToStep: (index: number) => void;
  skipWalkthrough: () => Promise<void>;
  setSpotlightArea: (area: WalkthroughStep['spotlightArea']) => void;
};

/**
 * 振り返り画面のウォークスルー。振り返りを有効にして、案内するカードがそろって
 * 表示されたとき(canStart)に1回だけ出す。完了したかは MMKV に持つ。
 */
export const useRideReviewWalkthrough = (
  canStart: boolean
): UseRideReviewWalkthroughResult => {
  // MMKV は同期 API のため初回レンダー時に完了状態が確定する
  const [isWalkthroughCompleted, setIsWalkthroughCompleted] = useState(
    () =>
      storage.getString(STORAGE_KEYS.RIDE_REVIEW_WALKTHROUGH_COMPLETED) ===
      'true'
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightArea, setSpotlightAreaState] =
    useState<WalkthroughStep['spotlightArea']>(undefined);

  const completeWalkthrough = useCallback(async () => {
    setIsWalkthroughCompleted(true);
    try {
      storage.set(STORAGE_KEYS.RIDE_REVIEW_WALKTHROUGH_COMPLETED, 'true');
    } catch (error) {
      // ストレージエラーは非ブロッキングとして扱う
      console.error(
        'Failed to save ride review walkthrough completion status:',
        error
      );
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < RIDE_REVIEW_WALKTHROUGH_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setSpotlightAreaState(undefined);
    } else {
      completeWalkthrough();
    }
  }, [currentStepIndex, completeWalkthrough]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < RIDE_REVIEW_WALKTHROUGH_STEPS.length) {
      setCurrentStepIndex(index);
      setSpotlightAreaState(undefined);
    }
  }, []);

  const skipWalkthrough = useCallback(async () => {
    await completeWalkthrough();
  }, [completeWalkthrough]);

  const setSpotlightArea = useCallback(
    (area: WalkthroughStep['spotlightArea']) => {
      setSpotlightAreaState(area);
    },
    []
  );

  const isWalkthroughActive =
    canStart &&
    !isWalkthroughCompleted &&
    currentStepIndex < RIDE_REVIEW_WALKTHROUGH_STEPS.length;

  const currentStep = isWalkthroughActive
    ? { ...RIDE_REVIEW_WALKTHROUGH_STEPS[currentStepIndex], spotlightArea }
    : null;

  return {
    isWalkthroughCompleted,
    isWalkthroughActive,
    currentStepIndex,
    currentStepId: currentStep?.id ?? null,
    currentStep,
    totalSteps: RIDE_REVIEW_WALKTHROUGH_STEPS.length,
    nextStep,
    goToStep,
    skipWalkthrough,
    setSpotlightArea,
  };
};
