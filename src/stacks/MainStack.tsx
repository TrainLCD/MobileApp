import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import AndroidSettings from '~/screens/AndroidSettings';
import BatterySettings from '~/screens/BatterySettings';
import DestinationAgentScreen from '~/screens/DestinationAgent';
import ExperimentalSettings from '~/screens/ExperimentalSettings';
import Licenses from '~/screens/Licenses';
import NotificationSettings from '~/screens/NotificationSettings';
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
import { selectedBoundAtom, stationAtom } from '../store/atoms/station';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { untouchableModeEnabledAtom } from '../store/atoms/tuning';
import { translate } from '../translation';

const Stack = createNativeStackNavigator();

const screenOptions: NativeStackNavigationOptions = {
  animation: 'none',
  headerShown: false,
};

const MainStack: React.FC = () => {
  const station = useAtomValue(stationAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const untouchableModeEnabled = useAtomValue(untouchableModeEnabledAtom);

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

  // タッチ不可モード中は走行画面からの離脱操作も誤操作とみなし、iOSの画面端
  // スワイプ(スワイプバック)をネイティブごと無効化する。Androidの戻るキー・
  // 戻るジェスチャーは usePreventBackInUntouchableMode 側で握りつぶしている。
  const mainScreenOptions = useMemo<NativeStackNavigationOptions>(
    () => ({
      ...optionsWithCustomStyle,
      gestureEnabled: !untouchableModeEnabled,
    }),
    [optionsWithCustomStyle, untouchableModeEnabled]
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
          options={mainScreenOptions}
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
          name="NotificationSettings"
          component={NotificationSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="AndroidSettings"
          component={AndroidSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="BatterySettings"
          component={BatterySettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="ExperimentalSettings"
          component={ExperimentalSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="RouteSearch"
          component={RouteSearchScreen}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="DestinationAgent"
          component={DestinationAgentScreen}
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
