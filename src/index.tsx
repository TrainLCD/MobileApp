import { ActionSheetProvider } from '@expo/react-native-action-sheet'
import remoteConfig from '@react-native-firebase/remote-config'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import * as Location from 'expo-location'
import React, { ErrorInfo, useCallback, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ActivityIndicator, StatusBar, StyleSheet, Text } from 'react-native'
import { RecoilRoot } from 'recoil'
import ErrorFallback from './components/ErrorBoundary'
import FakeStationSettings from './components/FakeStationSettings'
import TuningSettings from './components/TuningSettings'
import useAnonymousUser from './hooks/useAnonymousUser'
import useReport from './hooks/useReport'
import PrivacyScreen from './screens/Privacy'
import SavedRoutesScreen from './screens/SavedRoutesScreen'
import MainStack from './stacks/MainStack'
import { setI18nConfig } from './translation'

const Stack = createStackNavigator()

const screenOptions = {
  headerShown: false,
}
const options = {
  animationEnabled: false,
  cardStyle: {
    backgroundColor: '#fff',
    opacity: 1,
  },
}

const App: React.FC = () => {
  const [readyForLaunch, setReadyForLaunch] = useState(false)
  const [permissionsGranted, setPermissionsGranted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      await remoteConfig().fetchAndActivate()
      await setI18nConfig()

      const locationServicesEnabled = await Location.hasServicesEnabledAsync()
      if (!locationServicesEnabled) {
        setReadyForLaunch(true)
        setPermissionsGranted(false)
        return
      }
      const { status } = await Location.getForegroundPermissionsAsync()
      setPermissionsGranted(status === Location.PermissionStatus.GRANTED)
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

  if (!readyForLaunch) {
    return <ActivityIndicator size="large" style={StyleSheet.absoluteFill} />
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleBoundaryError}
    >
      <ActionSheetProvider>
        <RecoilRoot>
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
                name="MainStack"
                component={MainStack}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </RecoilRoot>
      </ActionSheetProvider>
    </ErrorBoundary>
  )
}

export default React.memo(App)
