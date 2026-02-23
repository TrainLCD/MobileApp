import { memo, type ReactNode, useEffect } from 'react';
import { Alert } from 'react-native';
import { useDeepLink } from '../hooks/useDeepLink';
import { translate } from '../translation';

type Props = {
  children: ReactNode;
};

const DeepLinkProvider = ({ children }: Props) => {
  const { isLoading, error } = useDeepLink();
  useEffect(() => {
    if (error) {
      console.error(error);
      Alert.alert(translate('errorTitle'), translate('failedToFetchStation'));
    }
  }, [error]);
  if (isLoading && !error) {
    return null;
  }

  return children;
};

export default memo(DeepLinkProvider);
