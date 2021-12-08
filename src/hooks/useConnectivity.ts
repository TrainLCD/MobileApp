import { useNetInfo } from '@react-native-community/netinfo';

const useConnectivity = (): boolean => {
  const { isInternetReachable } = useNetInfo();
  return isInternetReachable === true;
};

export default useConnectivity;
