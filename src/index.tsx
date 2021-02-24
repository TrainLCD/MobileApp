import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import AppLoading from 'expo-app-loading';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RecoilRoot } from 'recoil';
import { StatusBar } from 'react-native';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import * as Permissions from 'expo-permissions';
import HMSLocation from '@hmscore/react-native-hms-location';
import { setI18nConfig } from './translation';
import AppleWatchProvider from './providers/AppleWatchProvider';
import MainStack from './stacks/MainStack';
import PrivacyScreen from './screens/Privacy';

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
  const [translationLoaded, setTranstationLoaded] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    const f = async (): Promise<void> => {
      await HMSLocation.LocationKit.Native.init();

      const { granted } = await Permissions.getAsync(Permissions.LOCATION);
      setPermissionsGranted(granted);
    };
    f();
  }, []);

  const loadTranslate = useCallback((): Promise<void> => setI18nConfig(), []);
  if (!translationLoaded) {
    return (
      <>
        <StatusBar translucent backgroundColor="transparent" />

        <AppLoading
          startAsync={loadTranslate}
          onError={console.warn}
          onFinish={(): void => setTranstationLoaded(true)}
        />
      </>
    );
  }

  return (
    <RecoilRoot>
      <ActionSheetProvider>
        <AppleWatchProvider>
          <SafeAreaProvider>
            <NavigationContainer>
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
                  name="MainStack"
                  component={MainStack}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </AppleWatchProvider>
      </ActionSheetProvider>
    </RecoilRoot>
  );
};

export default App;
