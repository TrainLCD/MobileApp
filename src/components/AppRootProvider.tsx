import { ApolloProvider } from '@apollo/client';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { ErrorBoundary } from '@sentry/react-native';
import React, { useCallback, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import useDevToken from '../hooks/useDevToken';
import useInitAnonymousUser from '../hooks/useInitAnonymousUser';
import devState from '../store/atoms/dev';
import { translate } from '../translation';
import getApolloClient from '../utils/apollo';
import ErrorScreen from './ErrorScreen';

type Props = {
  children: React.ReactNode;
};

const AppRootProvider: React.FC<Props> = ({ children }: Props) => {
  const { devMode } = useRecoilValue(devState);
  const apolloClient = useMemo(() => getApolloClient(devMode), [devMode]);
  useInitAnonymousUser();
  useDevToken();

  const errorFallback = useCallback(
    ({ error, resetError, componentStack }) => {
      return devMode ? (
        <ErrorScreen
          title={translate('errorTitle')}
          text={translate('appCrashedText')}
          reason={error.message}
          stacktrace={componentStack}
          onRetryPress={resetError}
        />
      ) : (
        <ErrorScreen
          title={translate('errorTitle')}
          text={translate('appCrashedText')}
          onRetryPress={resetError}
        />
      );
    },
    [devMode]
  );

  return (
    <ErrorBoundary fallback={errorFallback} showDialog>
      <ApolloProvider client={apolloClient}>
        <ActionSheetProvider>
          <SafeAreaProvider>{children}</SafeAreaProvider>
        </ActionSheetProvider>
      </ApolloProvider>
    </ErrorBoundary>
  );
};

export default AppRootProvider;
