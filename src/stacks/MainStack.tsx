import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React from 'react';
import { useRecoilValue } from 'recoil';
import ErrorScreen from '../components/ErrorScreen';
import Permitted from '../components/Permitted';
import useConnectivity from '../hooks/useConnectivity';
import { useUnderMaintenance } from '../hooks/useUnderMaintenance';
import AppSettings from '../screens/AppSettings';
import ThemeSettings from '../screens/AppSettings/ThemeSettings';
import EnabledLanguagesSettings from '../screens/EnabledLanguagesSettings';
import Main from '../screens/Main';
import NotificationSettings from '../screens/NotificationSettingsScreen';
import SelectBound from '../screens/SelectBound';
import SelectLine from '../screens/SelectLine';
import SpecifyDestinationSettingsScreen from '../screens/SpecifyDestinationSettingsScreen';
import TrainTypeSettings from '../screens/TrainTypeSettingsScreen';
import stationState from '../store/atoms/station';
import { translate } from '../translation';

const Stack = createNativeStackNavigator();

const screenOptions: NativeStackNavigationOptions = {
  animation: 'none',
  headerShown: false,
  contentStyle: { backgroundColor: '#fff' },
};

const optionsWithCustomStyle: NativeStackNavigationOptions = {};

const MainStack: React.FC = () => {
  const { station, selectedBound } = useRecoilValue(stationState);

  const isUnderMaintenance = useUnderMaintenance();
  const isInternetAvailable = useConnectivity();

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
        initialRouteName={selectedBound ? 'Main' : 'SelectLine'}
      >
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="SelectLine"
          component={SelectLine}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="SelectBound"
          component={SelectBound}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="Main"
          component={Main}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="AppSettings"
          component={AppSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="ThemeSettings"
          component={ThemeSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="EnabledLanguagesSettings"
          component={EnabledLanguagesSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="Notification"
          component={NotificationSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="TrainType"
          component={TrainTypeSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="SpecifyDestinationSettings"
          component={SpecifyDestinationSettingsScreen}
        />
      </Stack.Navigator>
    </Permitted>
  );
};

export default React.memo(MainStack);
