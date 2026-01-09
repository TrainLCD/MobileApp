import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { WalkthroughStep } from '../components/WalkthroughOverlay';
import { ASYNC_STORAGE_KEYS } from '../constants/asyncStorage';

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    titleKey: 'walkthroughTitle1',
    descriptionKey: 'walkthroughDescription1',
    tooltipPosition: 'bottom',
  },
  {
    titleKey: 'walkthroughTitle2',
    descriptionKey: 'walkthroughDescription2',
    tooltipPosition: 'top',
  },
  {
    titleKey: 'walkthroughTitle3',
    descriptionKey: 'walkthroughDescription3',
    tooltipPosition: 'bottom',
  },
];

type UseWalkthroughResult = {
  isWalkthroughCompleted: boolean | null;
  isWalkthroughActive: boolean;
  currentStepIndex: number;
  currentStep: WalkthroughStep | null;
  totalSteps: number;
  nextStep: () => void;
  goToStep: (index: number) => void;
  skipWalkthrough: () => Promise<void>;
  setSpotlightArea: (area: WalkthroughStep['spotlightArea']) => void;
};

export const useWalkthroughCompleted = (): UseWalkthroughResult => {
  const [isWalkthroughCompleted, setIsWalkthroughCompleted] = useState<
    boolean | null
  >(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightArea, setSpotlightAreaState] =
    useState<WalkthroughStep['spotlightArea']>(undefined);

  useEffect(() => {
    const checkWalkthroughCompleted = async () => {
      const completed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.WALKTHROUGH_COMPLETED
      );
      setIsWalkthroughCompleted(completed === 'true');
    };
    checkWalkthroughCompleted();
  }, []);

  const completeWalkthrough = useCallback(async () => {
    await AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.WALKTHROUGH_COMPLETED,
      'true'
    );
    setIsWalkthroughCompleted(true);
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

  return {
    isWalkthroughCompleted,
    isWalkthroughActive,
    currentStepIndex,
    currentStep,
    totalSteps: WALKTHROUGH_STEPS.length,
    nextStep,
    goToStep,
    skipWalkthrough,
    setSpotlightArea,
  };
};
