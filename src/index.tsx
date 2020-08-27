import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';
import React from 'react';
import { Provider } from 'react-redux';
import Layout from './components/Layout';
import MainScreen from './screens/Main';
import SelectBoundScreen from './screens/SelectBound';
import SelectLineScreen from './screens/SelectLine';
import ThemeSettingsScreen from './screens/ThemeSettings';
import store from './store';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';

const Stack = createStackNavigator();

const [locale] = Localization.locale.split('-');
i18n.locale = locale;
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

const App: React.FC = () => (
  <Provider store={store}>
    <NavigationContainer>
      <Layout>
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen
            options={options}
            name="SelectLine"
            component={SelectLineScreen}
          />
          <Stack.Screen
            options={options}
            name="SelectBound"
            component={SelectBoundScreen}
          />
          <Stack.Screen options={options} name="Main" component={MainScreen} />
          <Stack.Screen
            options={options}
            name="ThemeSettings"
            component={ThemeSettingsScreen}
          />
          <Stack.Screen
            options={options}
            name="Notification"
            component={NotificationSettingsScreen}
          />
        </Stack.Navigator>
      </Layout>
    </NavigationContainer>
  </Provider>
);

export default App;
