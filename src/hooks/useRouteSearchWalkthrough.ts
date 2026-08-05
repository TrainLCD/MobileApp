import { useCallback, useState } from 'react';
import type {
  WalkthroughStep,
  WalkthroughStepId,
} from '../components/WalkthroughOverlay';
import { STORAGE_KEYS } from '../constants/storage';
import { storage } from '../lib/storage';

const ROUTE_SEARCH_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'routeSearchIntro',
    titleKey: 'routeSearchWalkthroughTitle1',
    descriptionKey: 'routeSearchWalkthroughDescription1',
    tooltipPosition: 'bottom',
  },
  {
    id: 'routeSearchBar',
    titleKey: 'routeSearchWalkthroughTitle2',
    descriptionKey: 'routeSearchWalkthroughDescription2',
    tooltipPosition: 'bottom',
  },
  {
    id: 'routeSearchAgentBanner',
    titleKey: 'routeSearchWalkthroughAgentTitle',
    descriptionKey: 'routeSearchWalkthroughAgentDescription',
    tooltipPosition: 'bottom',
  },
  {
    id: 'routeSearchResults',
    titleKey: 'routeSearchWalkthroughTitle3',
    descriptionKey: 'routeSearchWalkthroughDescription3',
    tooltipPosition: 'bottom',
  },
];

const ROUTE_SEARCH_WALKTHROUGH_STEPS_WITHOUT_AI =
  ROUTE_SEARCH_WALKTHROUGH_STEPS.filter(
    (step) => step.id !== 'routeSearchAgentBanner'
  );

type UseRouteSearchWalkthroughResult = {
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

export const useRouteSearchWalkthrough = (
  includeAIAgentStep: boolean
): UseRouteSearchWalkthroughResult => {
  const walkthroughSteps = includeAIAgentStep
    ? ROUTE_SEARCH_WALKTHROUGH_STEPS
    : ROUTE_SEARCH_WALKTHROUGH_STEPS_WITHOUT_AI;

  // MMKV は同期 API のため初回レンダー時に完了状態が確定する
  const [isWalkthroughCompleted, setIsWalkthroughCompleted] = useState(
    () =>
      storage.getString(STORAGE_KEYS.ROUTE_SEARCH_WALKTHROUGH_COMPLETED) ===
      'true'
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightArea, setSpotlightAreaState] =
    useState<WalkthroughStep['spotlightArea']>(undefined);

  const completeWalkthrough = useCallback(async () => {
    setIsWalkthroughCompleted(true);
    try {
      storage.set(STORAGE_KEYS.ROUTE_SEARCH_WALKTHROUGH_COMPLETED, 'true');
    } catch (error) {
      // ストレージエラーは非ブロッキングとして扱う
      console.error(
        'Failed to save route search walkthrough completion status:',
        error
      );
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < walkthroughSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setSpotlightAreaState(undefined);
    } else {
      completeWalkthrough();
    }
  }, [currentStepIndex, completeWalkthrough, walkthroughSteps.length]);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < walkthroughSteps.length) {
        setCurrentStepIndex(index);
        setSpotlightAreaState(undefined);
      }
    },
    [walkthroughSteps.length]
  );

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
    currentStepIndex < walkthroughSteps.length;

  const currentStep = isWalkthroughActive
    ? {
        ...walkthroughSteps[currentStepIndex],
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
    totalSteps: walkthroughSteps.length,
    nextStep,
    goToStep,
    skipWalkthrough,
    setSpotlightArea,
  };
};
