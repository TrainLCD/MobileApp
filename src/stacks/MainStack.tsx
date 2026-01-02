import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import RouteSearchScreen from '~/screens/RouteSearchScreen';
import TTSSettings from '~/screens/TTSSettings';
import ErrorScreen from '../components/ErrorScreen';
import Permitted from '../components/Permitted';
import { useConnectivity, useUnderMaintenance } from '../hooks';
import AppSettings from '../screens/AppSettings';
import EnabledLanguagesSettings from '../screens/EnabledLanguagesSettings';
import Main from '../screens/Main';
import SelectLine from '../screens/SelectLineScreen';
import ThemeSettings from '../screens/ThemeSettings';
import stationState from '../store/atoms/station';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { translate } from '../translation';
import Licenses from '~/screens/Licenses';

const Stack = createNativeStackNavigator();

const screenOptions: NativeStackNavigationOptions = {
  animation: 'none',
  headerShown: false,
};

const MainStack: React.FC = () => {
  const { station, selectedBound } = useAtomValue(stationState);

  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const isUnderMaintenance = useUnderMaintenance();
  const isInternetAvailable = useConnectivity();

  const optionsWithCustomStyle = useMemo<NativeStackNavigationOptions>(
    () => ({
      contentStyle: {
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
          name="TTSSettings"
          component={TTSSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="EnabledLanguagesSettings"
          component={EnabledLanguagesSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="RouteSearch"
          component={RouteSearchScreen}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="Licenses"
          component={Licenses}
        />
      </Stack.Navigator>
    </Permitted>
  );
};

export default React.memo(MainStack);
