import { useCallback, useState } from 'react';
import type {
  WalkthroughStep,
  WalkthroughStepId,
} from '../components/WalkthroughOverlay';
import { STORAGE_KEYS } from '../constants/storage';
import { storage } from '../lib/storage';

const SETTINGS_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'settingsWelcome',
    titleKey: 'settingsWalkthroughTitle1',
    descriptionKey: 'settingsWalkthroughDescription1',
    tooltipPosition: 'bottom',
  },
  {
    id: 'settingsTheme',
    titleKey: 'settingsWalkthroughTitle2',
    descriptionKey: 'settingsWalkthroughDescription2',
    tooltipPosition: 'bottom',
  },
  {
    id: 'settingsTts',
    titleKey: 'settingsWalkthroughTitle3',
    descriptionKey: 'settingsWalkthroughDescription3',
    tooltipPosition: 'bottom',
  },
  {
    id: 'settingsLanguages',
    titleKey: 'settingsWalkthroughTitle4',
    descriptionKey: 'settingsWalkthroughDescription4',
    tooltipPosition: 'bottom',
  },
];

type UseSettingsWalkthroughResult = {
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

export const useSettingsWalkthrough = (): UseSettingsWalkthroughResult => {
  // MMKV は同期 API のため初回レンダー時に完了状態が確定する
  const [isWalkthroughCompleted, setIsWalkthroughCompleted] = useState(
    () =>
      storage.getString(STORAGE_KEYS.SETTINGS_WALKTHROUGH_COMPLETED) === 'true'
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightArea, setSpotlightAreaState] =
    useState<WalkthroughStep['spotlightArea']>(undefined);

  const completeWalkthrough = useCallback(async () => {
    setIsWalkthroughCompleted(true);
    try {
      storage.set(STORAGE_KEYS.SETTINGS_WALKTHROUGH_COMPLETED, 'true');
    } catch (error) {
      // ストレージエラーは非ブロッキングとして扱う
      console.error(
        'Failed to save settings walkthrough completion status:',
        error
      );
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < SETTINGS_WALKTHROUGH_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setSpotlightAreaState(undefined);
    } else {
      completeWalkthrough();
    }
  }, [currentStepIndex, completeWalkthrough]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < SETTINGS_WALKTHROUGH_STEPS.length) {
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
    currentStepIndex < SETTINGS_WALKTHROUGH_STEPS.length;

  const currentStep = isWalkthroughActive
    ? {
        ...SETTINGS_WALKTHROUGH_STEPS[currentStepIndex],
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
    totalSteps: SETTINGS_WALKTHROUGH_STEPS.length,
    nextStep,
    goToStep,
    skipWalkthrough,
    setSpotlightArea,
  };
};
