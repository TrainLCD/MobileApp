import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { PortalProvider } from '@gorhom/portal';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Location from 'expo-location';
import * as SplashScreen from 'expo-splash-screen';
import { Provider, useAtomValue } from 'jotai';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StatusBar, Text } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CommonDialogPresenter from './components/CommonDialogPresenter';
import CustomErrorBoundary from './components/CustomErrorBoundary';
import FxSystemColorScheme from './components/FxSystemColorScheme';
import { GlobalToast } from './components/GlobalToast';
import { queryClient } from './lib/gql';
import { migrateFromAsyncStorage } from './lib/storage';
import { AppColorsProvider } from './providers/AppColorsProvider';
import DeepLinkProvider from './providers/DeepLinkProvider';
import QuickActionsProvider from './providers/QuickActionsProvider';
import PrivacyScreen from './screens/Privacy';
import MainStack from './stacks/MainStack';
import { navigationRef } from './stacks/rootNavigation';
import { store } from './store';
import { appColorsAtom } from './store/atoms/colorScheme';
import { setI18nConfig } from './translation';
import { showDialogWhilePresenting } from './utils/dialogPresentation';

SplashScreen.preventAutoHideAsync();
setI18nConfig();

const Stack = createNativeStackNavigator();

const screenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};
const options: NativeStackNavigationOptions = {
  animation: 'none' as const,
  contentStyle: {
    backgroundColor: '#fff',
    opacity: 1,
  },
};

// プライバシー画面も操作系画面のためダークモードの対象にする
const operationScreenLayout = ({
  children,
}: {
  children: React.ReactElement;
}) => <AppColorsProvider>{children}</AppColorsProvider>;

const AppContent: React.FC = () => {
  useEffect(() => {
    type TextProps = {
      defaultProps: {
        allowFontScaling: boolean;
      };
    };
    (Text as unknown as TextProps).defaultProps =
      (Text as unknown as TextProps).defaultProps || {};
    (Text as unknown as TextProps).defaultProps.allowFontScaling = false;
  }, []);

  const [permStatus] = Location.useForegroundPermissions();

  const colors = useAtomValue(appColorsAtom);
  const privacyScreenOptions = useMemo<NativeStackNavigationOptions>(
    () => ({
      ...options,
      contentStyle: {
        backgroundColor: colors.plainBackground,
        opacity: 1,
      },
    }),
    [colors.plainBackground]
  );

  const [fontsLoaded, fontsLoadError] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontsLoadError) {
      if (fontsLoadError) {
        showDialogWhilePresenting(
          'fontLoadError',
          'Font Load Error',
          'Failed to load fonts.'
        );
      }
      SplashScreen.hideAsync();
    }
  }, [fontsLoadError, fontsLoaded]);

  return (
    <>
      {Platform.OS === 'ios' ? (
        <StatusBar hidden translucent backgroundColor="transparent" />
      ) : (
        <SystemBars hidden style="auto" />
      )}

      <Stack.Navigator screenOptions={screenOptions}>
        {!permStatus?.granted ? (
          <Stack.Screen
            layout={operationScreenLayout}
            options={privacyScreenOptions}
            name="Privacy"
            component={PrivacyScreen}
          />
        ) : null}

        <Stack.Screen
          options={options}
          name="MainStack"
          component={MainStack}
        />
      </Stack.Navigator>
    </>
  );
};

const App: React.FC = () => {
  // 画面側は MMKV を同期的に読むため、AsyncStorage からの移行完了を待ってから
  // マウントする。移行はキー数十件のコピー一回分なので体感遅延はない。
  // 失敗時も既定値で起動できるため、エラーは記録して描画は継続する。
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    migrateFromAsyncStorage()
      .catch((error) => {
        console.error('Failed to migrate AsyncStorage to MMKV:', error);
      })
      .finally(() => {
        setStorageReady(true);
      });
  }, []);

  if (!storageReady) {
    // SplashScreen.preventAutoHideAsync 済みのためスプラッシュが表示され続ける
    return null;
  }

  return (
    <GestureHandlerRootView>
      <QueryClientProvider client={queryClient}>
        <ActionSheetProvider>
          <Provider store={store}>
            <PortalProvider>
              {/* 端末のダークモード設定を購読して atom へ反映する */}
              <FxSystemColorScheme />
              {/* 画面をまたいで呼ばれる showDialog を一つの共通モーダルとして描画する。 */}
              <CommonDialogPresenter />
              <CustomErrorBoundary>
                <NavigationContainer ref={navigationRef}>
                  <DeepLinkProvider>
                    <QuickActionsProvider>
                      <AppContent />
                    </QuickActionsProvider>
                    <GlobalToast />
                  </DeepLinkProvider>
                </NavigationContainer>
              </CustomErrorBoundary>
            </PortalProvider>
          </Provider>
        </ActionSheetProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default React.memo(App);
