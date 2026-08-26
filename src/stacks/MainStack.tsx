import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import AndroidSettings from '~/screens/AndroidSettings';
import BatterySettings from '~/screens/BatterySettings';
import ColorSchemeSettings from '~/screens/ColorSchemeSettings';
import DestinationAgentScreen from '~/screens/DestinationAgent';
import ExperimentalSettings from '~/screens/ExperimentalSettings';
import Licenses from '~/screens/Licenses';
import NotificationSettings from '~/screens/NotificationSettings';
import RouteSearchScreen from '~/screens/RouteSearchScreen';
import TTSSettings from '~/screens/TTSSettings';
import ErrorScreen from '../components/ErrorScreen';
import Permitted from '../components/Permitted';
import { useConnectivity, useUnderMaintenance } from '../hooks';
import { AppColorsProvider } from '../providers/AppColorsProvider';
import AppSettings from '../screens/AppSettings';
import EnabledLanguagesSettings from '../screens/EnabledLanguagesSettings';
import Main from '../screens/Main';
import SelectLine from '../screens/SelectLineScreen';
import ThemeSettings from '../screens/ThemeSettings';
import { appColorsAtom } from '../store/atoms/colorScheme';
import { selectedBoundAtom, stationAtom } from '../store/atoms/station';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { untouchableModeEnabledAtom } from '../store/atoms/tuning';
import { translate } from '../translation';

const Stack = createNativeStackNavigator();

const screenOptions: NativeStackNavigationOptions = {
  animation: 'none',
  headerShown: false,
};

// 操作系画面(走行画面以外)だけをダークモードの対象にする。
// 走行画面は路線テーマが配色を決めるため、Provider の外側に置いて従来の色を保つ。
const operationScreenLayout = ({
  children,
}: {
  children: React.ReactElement;
}) => <AppColorsProvider>{children}</AppColorsProvider>;

const MainStack: React.FC = () => {
  const station = useAtomValue(stationAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const untouchableModeEnabled = useAtomValue(untouchableModeEnabledAtom);
  const colors = useAtomValue(appColorsAtom);

  const isUnderMaintenance = useUnderMaintenance();
  const isInternetAvailable = useConnectivity();

  const optionsWithCustomStyle = useMemo<NativeStackNavigationOptions>(
    () => ({
      contentStyle: {
        opacity: 1,
        backgroundColor: isLEDTheme ? '#212121' : colors.background,
      },
    }),
    [colors.background, isLEDTheme]
  );

  // 走行画面の背景はダークモード設定の影響を受けさせない
  const mainScreenContentStyle = useMemo<NativeStackNavigationOptions>(
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
      ...mainScreenContentStyle,
      gestureEnabled: !untouchableModeEnabled,
    }),
    [mainScreenContentStyle, untouchableModeEnabled]
  );

  if (isUnderMaintenance) {
    return (
      <AppColorsProvider>
        <ErrorScreen
          showStatus
          title={translate('maintenanceTitle')}
          text={translate('maintenanceText')}
        />
      </AppColorsProvider>
    );
  }

  if (!isInternetAvailable && !station) {
    return (
      <AppColorsProvider>
        <ErrorScreen
          title={translate('errorTitle')}
          text={translate('offlineText')}
        />
      </AppColorsProvider>
    );
  }

  return (
    <Permitted>
      <Stack.Navigator
        screenOptions={screenOptions}
        initialRouteName={selectedBound ? 'Main' : 'SelectLine'}
      >
        <Stack.Screen
          layout={operationScreenLayout}
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
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="AppSettings"
          component={AppSettings}
        />
        <Stack.Screen
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="ThemeSettings"
          component={ThemeSettings}
        />
        <Stack.Screen
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="ColorSchemeSettings"
          component={ColorSchemeSettings}
        />
        <Stack.Screen
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="TTSSettings"
          component={TTSSettings}
        />
        <Stack.Screen
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="EnabledLanguagesSettings"
          component={EnabledLanguagesSettings}
        />
        <Stack.Screen
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="NotificationSettings"
          component={NotificationSettings}
        />
        <Stack.Screen
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="AndroidSettings"
          component={AndroidSettings}
        />
        <Stack.Screen
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="BatterySettings"
          component={BatterySettings}
        />
        <Stack.Screen
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="ExperimentalSettings"
          component={ExperimentalSettings}
        />
        <Stack.Screen
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="RouteSearch"
          component={RouteSearchScreen}
        />
        <Stack.Screen
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="DestinationAgent"
          component={DestinationAgentScreen}
        />
        <Stack.Screen
          layout={operationScreenLayout}
          options={optionsWithCustomStyle}
          name="Licenses"
          component={Licenses}
        />
      </Stack.Navigator>
    </Permitted>
  );
};

export default React.memo(MainStack);
