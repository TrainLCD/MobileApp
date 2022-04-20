import { ApolloProvider } from '@apollo/client';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { ErrorBoundary } from '@sentry/react-native';
import React, { useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import getClient from '../api/apollo';
import ErrorScreen from '../components/ErrorScreen';
import devState from '../store/atoms/dev';
import { translate } from '../translation';
import AppleWatchProvider from './AppleWatchProvider';

type Props = {
  children: React.ReactNode;
};

const AppRootProvider: React.FC<Props> = ({ children }: Props) => {
  const { devMode } = useRecoilValue(devState);

  const client = getClient(devMode);

  const errorFallback = useCallback(
    ({ error, resetError }) => {
      return (
        <ErrorScreen
          title={translate('errorTitle')}
          text={
            devMode
              ? `${translate('appCrashedText')}\n${error.message}`
              : translate('appCrashedText')
          }
          onRetryPress={resetError}
        />
      );
    },
    [devMode]
  );

  return (
    <ErrorBoundary fallback={errorFallback}>
      <ApolloProvider client={client}>
        <ActionSheetProvider>
          <AppleWatchProvider>
            <SafeAreaProvider>{children}</SafeAreaProvider>
          </AppleWatchProvider>
        </ActionSheetProvider>
      </ApolloProvider>
    </ErrorBoundary>
  );
};

export default AppRootProvider;
