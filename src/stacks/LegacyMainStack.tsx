import {
  type StackNavigationOptions,
  createStackNavigator,
} from '@react-navigation/stack';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import ErrorScreen from '../components/ErrorScreen';
import Permitted from '../components/Permitted';
import { useConnectivity, useThemeStore, useUnderMaintenance } from '../hooks';
import { APP_THEME } from '../models/Theme';
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

const Stack = createStackNavigator();

const screenOptions: StackNavigationOptions = {
  animation: 'none',
  headerShown: false,
};

const LegacyMainStack: React.FC = () => {
  const { station, selectedBound } = useAtomValue(stationState);

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const isUnderMaintenance = useUnderMaintenance();
  const isInternetAvailable = useConnectivity();

  const optionsWithCustomStyle = useMemo<StackNavigationOptions>(
    () => ({
      cardStyle: {
        opacity: 1,
        backgroundColor: isLEDTheme ? '#212121' : '#fff',
      },
    }),
    [isLEDTheme]
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

export default React.memo(LegacyMainStack);
