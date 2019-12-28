import {ActionSheetProvider} from '@expo/react-native-action-sheet';
import React from 'react';
import {createAppContainer} from 'react-navigation';
import {Provider} from 'react-redux';
import Layout from './components/Layout';
import RootNavigator from './navigators/Root';
import store from './store';

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
