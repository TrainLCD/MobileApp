import { TransportProvider } from '@connectrpc/connect-query';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Location from 'expo-location';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'jotai';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
} from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomErrorBoundary from './components/CustomErrorBoundary';
import TuningSettings from './components/TuningSettings';
import { queryClient, transport } from './lib/grpc';
import DeepLinkProvider from './providers/DeepLinkProvider';
import FakeStationSettingsScreen from './screens/FakeStationSettingsScreen';
import PrivacyScreen from './screens/Privacy';
import RouteSearchScreen from './screens/RouteSearchScreen';
import SavedRoutesScreen from './screens/SavedRoutesScreen';
import MainStack from './stacks/MainStack';
import { setI18nConfig } from './translation';

SplashScreen.preventAutoHideAsync();

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

const App: React.FC = () => {
  const [readyForLaunch, setReadyForLaunch] = useState(false);

  useEffect(() => {
    (async () => {
      setI18nConfig();

      const locationServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!locationServicesEnabled) {
        setReadyForLaunch(true);
        return;
      }
      setReadyForLaunch(true);
    })();
  }, []);

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

  const [fontsLoaded, fontsLoadError] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
  });

  useEffect(() => {
    if (readyForLaunch && (fontsLoaded || fontsLoadError)) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoadError, fontsLoaded, readyForLaunch]);

  if (!readyForLaunch) {
    return <ActivityIndicator size="large" style={StyleSheet.absoluteFill} />;
  }

  return (
    <>
      {Platform.OS === 'ios' ? (
        <StatusBar hidden translucent backgroundColor="transparent" />
      ) : (
        <SystemBars hidden style="auto" />
      )}

      <CustomErrorBoundary>
        <GestureHandlerRootView>
          <TransportProvider transport={transport}>
            <QueryClientProvider client={queryClient}>
              <ActionSheetProvider>
                <Provider>
                  <NavigationContainer>
                    <DeepLinkProvider>
                      <Stack.Navigator screenOptions={screenOptions}>
                        {!permStatus?.granted ? (
                          <Stack.Screen
                            options={options}
                            name="Privacy"
                            component={PrivacyScreen}
                          />
                        ) : null}

                        <Stack.Screen
                          options={options}
                          name="MainStack"
                          component={MainStack}
                        />

                        <Stack.Screen
                          options={options}
                          name="FakeStation"
                          component={FakeStationSettingsScreen}
                        />

                        <Stack.Screen
                          options={options}
                          name="TuningSettings"
                          component={TuningSettings}
                        />

                        <Stack.Screen
                          options={options}
                          name="SavedRoutes"
                          component={SavedRoutesScreen}
                        />

                        <Stack.Screen
                          options={options}
                          name="RouteSearch"
                          component={RouteSearchScreen}
                        />
                      </Stack.Navigator>
                    </DeepLinkProvider>
                  </NavigationContainer>
                </Provider>
              </ActionSheetProvider>
            </QueryClientProvider>
          </TransportProvider>
        </GestureHandlerRootView>
      </CustomErrorBoundary>
    </>
  );
};

export default React.memo(App);
