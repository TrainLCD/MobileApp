import {
  createStackNavigator,
  type StackNavigationOptions,
} from '@react-navigation/stack';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import Home from '~/screens/Home';
import ErrorScreen from '../components/ErrorScreen';
import Permitted from '../components/Permitted';
import { useConnectivity, useUnderMaintenance } from '../hooks';
import AppSettings from '../screens/AppSettings';
import ThemeSettings from '../screens/AppSettings/ThemeSettings';
import EnabledLanguagesSettings from '../screens/EnabledLanguagesSettings';
import Main from '../screens/Main';
import NotificationSettings from '../screens/NotificationSettingsScreen';
import SpecifyDestinationSettingsScreen from '../screens/SpecifyDestinationSettingsScreen';
import TrainTypeSettings from '../screens/TrainTypeSettingsScreen';
import stationState from '../store/atoms/station';
import { translate } from '../translation';

const Stack = createStackNavigator();

const screenOptions: StackNavigationOptions = {
  animation: 'none',
  cardStyle: { backgroundColor: '#fff' },
};

const MainStack: React.FC = () => {
  const { station, selectedBound } = useAtomValue(stationState);

  const isUnderMaintenance = useUnderMaintenance();
  const isInternetAvailable = useConnectivity();

  const optionsForMainScreen = useMemo<StackNavigationOptions>(
    () => ({ headerShown: false }),
    []
  );

  if (isUnderMaintenance) {
    return (
      <ErrorScreen
        showStatus
        title={translate('maintenanceTitle')}
        text={translate('maintenanceText')}
      />
    );
  }

  if (!isInternetAvailable && !station) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('offlineText')}
      />
    );
  }

  return (
    <Permitted>
      <Stack.Navigator
        screenOptions={screenOptions}
        initialRouteName={selectedBound ? 'Main' : 'Home'}
      >
        <Stack.Screen
          options={{
            title: translate('homeTitle'),
          }}
          name="Home"
          component={Home}
        />
        <Stack.Screen
          options={optionsForMainScreen}
          name="Main"
          component={Main}
        />
        <Stack.Screen name="AppSettings" component={AppSettings} />
        <Stack.Screen
          name="ThemeSettings"
          component={ThemeSettings}
          options={{ title: translate('selectThemeTitle') }}
        />
        <Stack.Screen
          name="EnabledLanguagesSettings"
          component={EnabledLanguagesSettings}
        />
        <Stack.Screen name="Notification" component={NotificationSettings} />
        <Stack.Screen name="TrainType" component={TrainTypeSettings} />
        <Stack.Screen
          name="SpecifyDestinationSettings"
          component={SpecifyDestinationSettingsScreen}
        />
      </Stack.Navigator>
    </Permitted>
  );
};

export default React.memo(MainStack);
