import { useCallback, useState } from 'react';
import type {
  WalkthroughStep,
  WalkthroughStepId,
} from '../components/WalkthroughOverlay';
import { STORAGE_KEYS } from '../constants/storage';
import { storage } from '../lib/storage';

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'welcome',
    titleKey: 'walkthroughTitle1',
    descriptionKey: 'walkthroughDescription1',
    tooltipPosition: 'bottom',
  },
  {
    id: 'changeLocation',
    titleKey: 'walkthroughTitle2',
    descriptionKey: 'walkthroughDescription2',
    tooltipPosition: 'bottom',
  },
  {
    id: 'selectLine',
    titleKey: 'walkthroughTitle3',
    descriptionKey: 'walkthroughDescription3',
    tooltipPosition: 'top',
  },
  {
    id: 'savedRoutes',
    titleKey: 'walkthroughTitle5',
    descriptionKey: 'walkthroughDescription5',
    tooltipPosition: 'bottom',
  },
  {
    id: 'routeSearch',
    titleKey: 'walkthroughTitle6',
    descriptionKey: 'walkthroughDescription6',
    tooltipPosition: 'top',
  },
  {
    id: 'customize',
    titleKey: 'walkthroughTitle4',
    descriptionKey: 'walkthroughDescription4',
    tooltipPosition: 'top',
  },
];

type UseWalkthroughResult = {
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

export const useWalkthroughCompleted = (): UseWalkthroughResult => {
  // MMKV は同期 API のため初回レンダー時に完了状態が確定する
  const [isWalkthroughCompleted, setIsWalkthroughCompleted] = useState(
    () => storage.getString(STORAGE_KEYS.WALKTHROUGH_COMPLETED) === 'true'
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightArea, setSpotlightAreaState] =
    useState<WalkthroughStep['spotlightArea']>(undefined);

  const completeWalkthrough = useCallback(async () => {
    setIsWalkthroughCompleted(true);
    try {
      storage.set(STORAGE_KEYS.WALKTHROUGH_COMPLETED, 'true');
    } catch (error) {
      // ストレージエラーは非ブロッキングとして扱う
      console.error('Failed to save walkthrough completion status:', error);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < WALKTHROUGH_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setSpotlightAreaState(undefined);
    } else {
      completeWalkthrough();
    }
  }, [currentStepIndex, completeWalkthrough]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < WALKTHROUGH_STEPS.length) {
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
    isWalkthroughCompleted === false &&
    currentStepIndex < WALKTHROUGH_STEPS.length;

  const currentStep = isWalkthroughActive
    ? {
        ...WALKTHROUGH_STEPS[currentStepIndex],
        spotlightArea,
      }
    : null;

  const currentStepId = currentStep?.id ?? null;

  return {
    isWalkthroughCompleted,
    isWalkthroughActive,
    currentStepIndex,
    currentStepId,
    currentStep,
    totalSteps: WALKTHROUGH_STEPS.length,
    nextStep,
    goToStep,
    skipWalkthrough,
    setSpotlightArea,
  };
};
