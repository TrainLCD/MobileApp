import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import AppLoading from 'expo-app-loading';
import { RecoilRoot } from 'recoil';
import { StatusBar } from 'react-native';
import * as Location from 'expo-location';
import { setI18nConfig } from './translation';
import MainStack from './stacks/MainStack';
import PrivacyScreen from './screens/Privacy';
import AppRootProvider from './providers/AppRootProvider';
import FakeStationSettings from './components/FakeStationSettings';

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
      const { status } = await Location.getForegroundPermissionsAsync();
      const granted = status === Location.PermissionStatus.GRANTED;
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
      <AppRootProvider>
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
              name="FakeStation"
              component={FakeStationSettings}
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

export default App;
