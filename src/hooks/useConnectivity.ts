import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

const useConnectivity = (): boolean => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(({ isInternetReachable }) => {
      if (isInternetReachable === null) {
        return;
      }
      setIsConnected(isInternetReachable);
    });
    return unsubscribe;
  }, []);

  return isConnected;
};

export default useConnectivity;
