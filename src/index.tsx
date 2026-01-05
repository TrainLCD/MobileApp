import { ApolloProvider } from '@apollo/client/react';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { PortalProvider } from '@gorhom/portal';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import * as Location from 'expo-location';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'jotai';
import React, { useEffect } from 'react';
import { Alert, Platform, StatusBar, Text } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomErrorBoundary from './components/CustomErrorBoundary';
import { GlobalToast } from './components/GlobalToast';
import TuningSettings from './components/TuningSettings';
import { gqlClient } from './lib/gql';
import DeepLinkProvider from './providers/DeepLinkProvider';
import PrivacyScreen from './screens/Privacy';
import MainStack from './stacks/MainStack';
import { store } from './store';
import { setI18nConfig } from './translation';

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

const App: React.FC = () => {
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
    if (fontsLoaded || fontsLoadError) {
      if (fontsLoadError) {
        Alert.alert('Font Load Error', 'Failed to load fonts.');
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

      <CustomErrorBoundary>
        <GestureHandlerRootView>
          <ApolloProvider client={gqlClient}>
            <ActionSheetProvider>
              <Provider store={store}>
                <NavigationContainer>
                  <DeepLinkProvider>
                    <PortalProvider>
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
                          name="TuningSettings"
                          component={TuningSettings}
                        />
                      </Stack.Navigator>
                    </PortalProvider>
                    <GlobalToast />
                  </DeepLinkProvider>
                </NavigationContainer>
              </Provider>
            </ActionSheetProvider>
          </ApolloProvider>
        </GestureHandlerRootView>
      </CustomErrorBoundary>
    </>
  );
};

export default React.memo(App);
