import {ActionSheetProvider} from '@expo/react-native-action-sheet';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';
import React from 'react';
import {Provider} from 'react-redux';
import Layout from './components/Layout';
import MainScreen from './screens/Main';
import SelectBoundScreen from './screens/SelectBound';
import SelectLineScreen from './screens/SelectLine';
import store from './store';

const Stack = createStackNavigator();

i18n.locale = Localization.locale.split('-')[0];
i18n.fallbacks = true;

const screenOptions = {
  headerShown: false,
};

const options = {
  animationEnabled: false,
  cardStyle: {
    backgroundColor: '#fff',
    opacity: 1,
  },
};

const App = () => (
  <Provider store={store}>
    <ActionSheetProvider>
      <NavigationContainer>
        <Layout>
          <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen
              options={options}
              name='SelectLine'
              component={SelectLineScreen}
            />
            <Stack.Screen
              options={options}
              name='SelectBound'
              component={SelectBoundScreen}
            />
            <Stack.Screen
              options={options}
              name='Main'
              component={MainScreen}
            />
          </Stack.Navigator>
        </Layout>
      </NavigationContainer>
    </ActionSheetProvider>
  </Provider>
);

export default App;
