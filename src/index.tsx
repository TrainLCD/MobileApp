import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { StatusBar, Text } from 'react-native';
import { RecoilRoot } from 'recoil';
import ErrorFallback from './components/ErrorBoundary';
import FakeStationSettings from './components/FakeStationSettings';
import TuningSettings from './components/TuningSettings';
import { LOCATION_TASK_NAME } from './constants/location';
import MyApolloProvider from './providers/DevModeProvider';
import ConnectMirroringShareSettings from './screens/ConnectMirroringShareSettings';
import DumpedGPXSettings from './screens/DumpedGPXSettings';
import PrivacyScreen from './screens/Privacy';
import MainStack from './stacks/MainStack';
import { setI18nConfig } from './translation';

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
  const [translationLoaded, setTranslationLoaded] = useState(false);

  const loadTranslate = useCallback((): Promise<void> => setI18nConfig(), []);

  useEffect(() => {
    const initAsync = async () => {
      await loadTranslate();
      setTranslationLoaded(true);
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
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={console.error}>
      <RecoilRoot>
        <MyApolloProvider>
          <ActionSheetProvider>
            <NavigationContainer ref={navigationRef}>
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
          </ActionSheetProvider>
        </MyApolloProvider>
      </RecoilRoot>
    </ErrorBoundary>
  );
};

export default App;
