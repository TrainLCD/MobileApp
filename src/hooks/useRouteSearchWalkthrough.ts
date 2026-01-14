import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type {
  WalkthroughStep,
  WalkthroughStepId,
} from '../components/WalkthroughOverlay';
import { ASYNC_STORAGE_KEYS } from '../constants/asyncStorage';

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
    id: 'routeSearchResults',
    titleKey: 'routeSearchWalkthroughTitle3',
    descriptionKey: 'routeSearchWalkthroughDescription3',
    tooltipPosition: 'top',
  },
];

type UseRouteSearchWalkthroughResult = {
  isWalkthroughCompleted: boolean | null;
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

export const useRouteSearchWalkthrough =
  (): UseRouteSearchWalkthroughResult => {
    const [isWalkthroughCompleted, setIsWalkthroughCompleted] = useState<
      boolean | null
    >(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [spotlightArea, setSpotlightAreaState] =
      useState<WalkthroughStep['spotlightArea']>(undefined);

    useEffect(() => {
      const checkWalkthroughCompleted = async () => {
        try {
          const completed = await AsyncStorage.getItem(
            ASYNC_STORAGE_KEYS.ROUTE_SEARCH_WALKTHROUGH_COMPLETED
          );
          setIsWalkthroughCompleted(completed === 'true');
        } catch (error) {
          console.error(
            'Failed to check route search walkthrough completion status:',
            error
          );
          setIsWalkthroughCompleted(false);
        }
      };
      checkWalkthroughCompleted();
    }, []);

    const completeWalkthrough = useCallback(async () => {
      setIsWalkthroughCompleted(true);
      try {
        await AsyncStorage.setItem(
          ASYNC_STORAGE_KEYS.ROUTE_SEARCH_WALKTHROUGH_COMPLETED,
          'true'
        );
      } catch (error) {
        console.error(
          'Failed to save route search walkthrough completion status:',
          error
        );
      }
    }, []);

    const nextStep = useCallback(() => {
      if (currentStepIndex < ROUTE_SEARCH_WALKTHROUGH_STEPS.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
        setSpotlightAreaState(undefined);
      } else {
        completeWalkthrough();
      }
    }, [currentStepIndex, completeWalkthrough]);

    const goToStep = useCallback((index: number) => {
      if (index >= 0 && index < ROUTE_SEARCH_WALKTHROUGH_STEPS.length) {
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
      currentStepIndex < ROUTE_SEARCH_WALKTHROUGH_STEPS.length;

    const currentStep = isWalkthroughActive
      ? {
          ...ROUTE_SEARCH_WALKTHROUGH_STEPS[currentStepIndex],
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
      totalSteps: ROUTE_SEARCH_WALKTHROUGH_STEPS.length,
      nextStep,
      goToStep,
      skipWalkthrough,
      setSpotlightArea,
    };
  };
