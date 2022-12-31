import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Sentry from '@sentry/react-native';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, Text } from 'react-native';
import { RecoilRoot } from 'recoil';
import AppRootProvider from './components/AppRootProvider';
import FakeStationSettings from './components/FakeStationSettings';
import TuningSettings from './components/TuningSettings';
import { LOCATION_TASK_NAME } from './constants/location';
import ConnectMirroringShareSettings from './screens/ConnectMirroringShareSettings';
import DumpedGPXSettings from './screens/DumpedGPXSettings';
import PrivacyScreen from './screens/Privacy';
import MainStack from './stacks/MainStack';
import { setI18nConfig } from './translation';

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();

if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.ReactNativeTracing({
        routingInstrumentation,
      }),
    ],
  });
}

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

const App: React.FC = () => {
  const navigationRef = useRef<NavigationContainerRef>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [translationLoaded, setTranstationLoaded] = useState(false);

  const loadTranslate = useCallback((): Promise<void> => setI18nConfig(), []);

  useEffect(() => {
    const initAsync = async () => {
      await loadTranslate();
      setTranstationLoaded(true);
    };
    initAsync();
  }, [loadTranslate]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Text as any).defaultProps = (Text as any).defaultProps || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Text as any).defaultProps.allowFontScaling = false;
  }, []);

  useEffect(() => {
    const f = async (): Promise<void> => {
      const { status } = await Location.getForegroundPermissionsAsync();
      const granted = status === Location.PermissionStatus.GRANTED;
      setPermissionsGranted(granted);
    };
    f();
  }, []);

  useEffect(() => {
    return () => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    };
  }, []);

  if (!translationLoaded) {
    return null;
  }

  return (
    <RecoilRoot>
      <AppRootProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            routingInstrumentation.registerNavigationContainer(navigationRef);
          }}
        >
          <StatusBar hidden translucent backgroundColor="transparent" />

          <Stack.Navigator
            screenOptions={screenOptions}
            initialRouteName={permissionsGranted ? 'MainStack' : 'Privacy'}
          >
            <Stack.Screen
              options={options}
              name="Privacy"
              component={PrivacyScreen}
            />

            <Stack.Screen
              options={options}
              name="FakeStation"
              component={FakeStationSettings}
            />

            <Stack.Screen
              options={options}
              name="ConnectMirroringShare"
              component={ConnectMirroringShareSettings}
            />

            <Stack.Screen
              options={options}
              name="DumpedGPX"
              component={DumpedGPXSettings}
            />

            <Stack.Screen
              options={options}
              name="TuningSettings"
              component={TuningSettings}
            />

            <Stack.Screen
              options={options}
              name="MainStack"
              component={MainStack}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AppRootProvider>
    </RecoilRoot>
  );
};

export default Sentry.wrap(App);
