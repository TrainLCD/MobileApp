import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const useAppState = (): AppStateStatus => {
  const [appState, setAppState] = useState(AppState.currentState);

  const handleAppStateChange = useCallback(setAppState, [setAppState]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return subscription.remove;
  }, [handleAppStateChange]);

  return appState;
};

export default useAppState;
