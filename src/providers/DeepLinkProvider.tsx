import { memo, type ReactNode, useEffect } from 'react';
import { Alert } from 'react-native';
import { useDeepLink } from '../hooks';
import { translate } from '../translation';

type Props = {
  children: ReactNode;
};

const DeepLinkProvider = ({ children }: Props) => {
  const { isLoading: isRoutesLoadingByLink, error: fetchRoutesByLinkError } =
    useDeepLink();
  useEffect(() => {
    if (fetchRoutesByLinkError) {
      console.error(fetchRoutesByLinkError);
      Alert.alert(translate('errorTitle'), translate('failedToFetchStation'));
    }
  }, [fetchRoutesByLinkError]);
  if (isRoutesLoadingByLink && !fetchRoutesByLinkError) {
    return null;
  }

  return children;
};

export default memo(DeepLinkProvider);
