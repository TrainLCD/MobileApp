import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const useAppState = (): AppStateStatus => {
  const [appState, setAppState] = useState(AppState.currentState);

  const handleAppStateChange = useCallback(setAppState, [setAppState]);

  useEffect(() => {
    AppState.addEventListener('change', handleAppStateChange);
    return () => {
      AppState.removeEventListener('change', handleAppStateChange);
    };
  }, [handleAppStateChange]);

  return appState;
};

export default useAppState;
