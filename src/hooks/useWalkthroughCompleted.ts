import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { ASYNC_STORAGE_KEYS } from '../constants/asyncStorage';

type UseWalkthroughCompletedResult = {
  isWalkthroughCompleted: boolean | null;
  setWalkthroughCompleted: () => Promise<void>;
};

export const useWalkthroughCompleted = (): UseWalkthroughCompletedResult => {
  const [isWalkthroughCompleted, setIsWalkthroughCompleted] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    const checkWalkthroughCompleted = async () => {
      const completed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.WALKTHROUGH_COMPLETED
      );
      setIsWalkthroughCompleted(completed === 'true');
    };
    checkWalkthroughCompleted();
  }, []);

  const setWalkthroughCompleted = useCallback(async () => {
    await AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.WALKTHROUGH_COMPLETED,
      'true'
    );
    setIsWalkthroughCompleted(true);
  }, []);

  return { isWalkthroughCompleted, setWalkthroughCompleted };
};
