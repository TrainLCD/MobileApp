import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { useRecoilValue } from 'recoil';
import getClient from '../api/apollo';
import AppleWatchProvider from './AppleWatchProvider';
import devState from '../store/atoms/dev';

type Props = {
  children: React.ReactNode;
};

const AppRootProvider: React.FC<Props> = ({ children }: Props) => {
  const { devMode } = useRecoilValue(devState);

  const client = getClient(devMode);

  return (
    <ApolloProvider client={client}>
      <ActionSheetProvider>
        <AppleWatchProvider>
          <SafeAreaProvider>{children}</SafeAreaProvider>
        </AppleWatchProvider>
      </ActionSheetProvider>
    </ApolloProvider>
  );
};

export default AppRootProvider;
