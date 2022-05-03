import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import Layout from '../components/Layout';
import AppSettings from '../screens/AppSettings';
import ThemeSettings from '../screens/AppSettings/ThemeSettings';
import EnabledLanguagesSettings from '../screens/EnabledLanguagesSettings';
import Main from '../screens/Main';
import NotificationSettings from '../screens/NotificationSettingsScreen';
import SelectBound from '../screens/SelectBound';
import SelectLine from '../screens/SelectLine';
import TrainTypeSettings from '../screens/TrainTypeSettingsScreen';

const Stack = createStackNavigator();

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

const MainStack: React.FC = () => (
  <Layout>
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        options={options}
        name="SelectLine"
        component={SelectLine}
      />
      <Stack.Screen
        options={options}
        name="SelectBound"
        component={SelectBound}
      />
      <Stack.Screen options={options} name="Main" component={Main} />
      <Stack.Screen
        options={options}
        name="AppSettings"
        component={AppSettings}
      />
      <Stack.Screen
        options={options}
        name="ThemeSettings"
        component={ThemeSettings}
      />
      <Stack.Screen
        options={options}
        name="EnabledLanguagesSettings"
        component={EnabledLanguagesSettings}
      />
      <Stack.Screen
        options={options}
        name="Notification"
        component={NotificationSettings}
      />
      <Stack.Screen
        options={options}
        name="TrainType"
        component={TrainTypeSettings}
      />
    </Stack.Navigator>
  </Layout>
);

export default React.memo(MainStack);
