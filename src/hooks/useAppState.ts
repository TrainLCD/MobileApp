import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

const useAppState = (): AppStateStatus => {
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return subscription.remove;
  }, []);

  return appState;
};

export default useAppState;
