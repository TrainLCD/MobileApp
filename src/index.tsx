import { TransportProvider } from '@connectrpc/connect-query'
import {
  Roboto_400Regular,
  Roboto_700Bold,
  useFonts,
} from '@expo-google-fonts/roboto'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import remoteConfig from '@react-native-firebase/remote-config'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { QueryClientProvider } from '@tanstack/react-query'
import * as Location from 'expo-location'
import * as SplashScreen from 'expo-splash-screen'
import React, { ErrorInfo, useCallback, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ActivityIndicator, StatusBar, StyleSheet, Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { RecoilRoot } from 'recoil'
import ErrorFallback from './components/ErrorBoundary'
import TuningSettings from './components/TuningSettings'
import useAnonymousUser from './hooks/useAnonymousUser'
import useReport from './hooks/useReport'
import { queryClient, transport } from './lib/grpc'
import DeepLinkProvider from './providers/DeepLinkProvider'
import FakeStationSettingsScreen from './screens/FakeStationSettingsScreen'
import PrivacyScreen from './screens/Privacy'
import RouteSearchScreen from './screens/RouteSearchScreen'
import SavedRoutesScreen from './screens/SavedRoutesScreen'
import MainStack from './stacks/MainStack'
import { setI18nConfig } from './translation'

SplashScreen.preventAutoHideAsync()

const Stack = createStackNavigator()

const screenOptions = {
  headerShown: false,
}
const options = {
  animation: 'none',
  cardStyle: {
    backgroundColor: '#fff',
    opacity: 1,
  },
}

const App: React.FC = () => {
  const [readyForLaunch, setReadyForLaunch] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      await remoteConfig().fetchAndActivate()
      setI18nConfig()

      const locationServicesEnabled = await Location.hasServicesEnabledAsync()
      if (!locationServicesEnabled) {
        setReadyForLaunch(true)
        return
      }
      setReadyForLaunch(true)
    })()
  }, [])

  useEffect(() => {
    type TextProps = {
      defaultProps: {
        allowFontScaling: boolean
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(Text as unknown as TextProps).defaultProps =
      (Text as unknown as TextProps).defaultProps || {}
    ;(Text as unknown as TextProps).defaultProps.allowFontScaling = false
  }, [])

  const user = useAnonymousUser()
  const { sendReport } = useReport(user ?? null)
  const [permStatus] = Location.useForegroundPermissions()

  const handleBoundaryError = useCallback(
    async (error: Error, info: ErrorInfo) => {
      if (!__DEV__) {
        await sendReport({
          reportType: 'crash',
          description: error.message,
          stacktrace: info.componentStack
            ?.split('\n')
            ?.filter((c) => c.length !== 0)
            ?.map((c) => c.trim())
            .join('\n'),
        })
      }
    },
    [sendReport]
  )

  const [fontsLoaded, fontsLoadError] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
  })

  useEffect(() => {
    if (readyForLaunch && (fontsLoaded || fontsLoadError)) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoadError, fontsLoaded, readyForLaunch])

  if (!readyForLaunch) {
    return <ActivityIndicator size="large" style={StyleSheet.absoluteFill} />
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleBoundaryError}
    >
      <TransportProvider transport={transport}>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <BottomSheetModalProvider>
              <RecoilRoot>
                <NavigationContainer>
                  <DeepLinkProvider>
                    <StatusBar
                      hidden
                      translucent
                      backgroundColor="transparent"
                    />

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
              </RecoilRoot>
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </TransportProvider>
    </ErrorBoundary>
  )
}

export default React.memo(App)
