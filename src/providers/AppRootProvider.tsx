import { ApolloProvider } from '@apollo/client';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import getClient from '../api/apollo';
import devState from '../store/atoms/dev';
import AppleWatchProvider from './AppleWatchProvider';

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
