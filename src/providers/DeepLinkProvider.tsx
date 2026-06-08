import { memo, type ReactNode, useEffect } from 'react';
import { useDeepLink } from '../hooks/useDeepLink';
import { translate } from '../translation';
import { showAlertWhilePresenting } from '../utils/alertPresentation';

type Props = {
  children: ReactNode;
};

const DeepLinkProvider = ({ children }: Props) => {
  const { initialUrlProcessed, isLoading, error } = useDeepLink();
  useEffect(() => {
    if (error) {
      console.error(error);
      showAlertWhilePresenting(
        'deepLinkFetchStationError',
        translate('errorTitle'),
        translate('failedToFetchStation')
      );
    }
  }, [error]);
  if (!initialUrlProcessed || (isLoading && !error)) {
    return null;
  }

  return children;
};

export default memo(DeepLinkProvider);
