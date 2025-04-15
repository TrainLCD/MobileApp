import { useNetworkState } from 'expo-network';

const useConnectivity = (): boolean => {
  const networkState = useNetworkState();

  return networkState.isConnected ?? false;
};

export default useConnectivity;
