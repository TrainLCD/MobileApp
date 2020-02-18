import {ActionSheetProvider} from '@expo/react-native-action-sheet';
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';
import React from 'react';
import {createAppContainer} from 'react-navigation';
import {Provider} from 'react-redux';
import Layout from './components/Layout';
import RootNavigator from './navigators/Root';
import store from './store';

i18n.locale = Localization.locale.split('-')[0];
i18n.fallbacks = true;

const AppNavigator = createAppContainer(RootNavigator);

const App = () => (
  <Provider store={store}>
    <ActionSheetProvider>
      <Layout>
        <AppNavigator/>
      </Layout>
    </ActionSheetProvider>
  </Provider>
);

export default App;
