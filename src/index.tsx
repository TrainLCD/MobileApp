import React from 'react';
import { createAppContainer } from 'react-navigation';
import { Provider } from 'react-redux';

import RootNavigator from './navigators/Root';
import store from './store';

const AppNavigator = createAppContainer(RootNavigator);

const App = () => (
  <Provider store={store}>
    <AppNavigator />
  </Provider>
);

export default App;
