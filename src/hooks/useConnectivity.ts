import { useNetworkState } from 'expo-network';

export const useConnectivity = (): boolean => {
  const networkState = useNetworkState();

  return networkState.isConnected ?? true;
};
