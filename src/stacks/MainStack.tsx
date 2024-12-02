import { createStackNavigator } from '@react-navigation/stack'
import React, { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import ErrorScreen from '../components/ErrorScreen'
import Permitted from '../components/Permitted'
import useConnectivity from '../hooks/useConnectivity'
import { useThemeStore } from '../hooks/useThemeStore'
import { useUnderMaintenance } from '../hooks/useUnderMaintenance'
import { APP_THEME } from '../models/Theme'
import AppSettings from '../screens/AppSettings'
import ThemeSettings from '../screens/AppSettings/ThemeSettings'
import EnabledLanguagesSettings from '../screens/EnabledLanguagesSettings'
import Main from '../screens/Main'
import NotificationSettings from '../screens/NotificationSettingsScreen'
import SelectBound from '../screens/SelectBound'
import SelectLine from '../screens/SelectLine'
import SpecifyDestinationSettingsScreen from '../screens/SpecifyDestinationSettingsScreen'
import TrainTypeSettings from '../screens/TrainTypeSettingsScreen'
import lineState from '../store/atoms/line'
import stationState from '../store/atoms/station'
import { translate } from '../translation'

const Stack = createStackNavigator()

const screenOptions = {
  headerShown: false,
}

const MainStack: React.FC = () => {
  const { station, selectedDirection } = useRecoilValue(stationState)
  const { selectedLine } = useRecoilValue(lineState)
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)

  const isUnderMaintenance = useUnderMaintenance()
  const isInternetAvailable = useConnectivity()

  const optionsWithCustomStyle = useMemo(
    () => ({
      animation: 'none',
      cardStyle: {
        opacity: 1,
        backgroundColor: isLEDTheme ? '#212121' : '#fff',
      },
    }),
    [isLEDTheme]
  )

  if (isUnderMaintenance) {
    return (
      <ErrorScreen
        showStatus
        title={translate('maintenanceTitle')}
        text={translate('maintenanceText')}
      />
    )
  }

  if (!isInternetAvailable && !station) {
    return (
      <ErrorScreen
        title={translate('errorTitle')}
        text={translate('offlineText')}
      />
    )
  }

  return (
    <Permitted>
      <Stack.Navigator screenOptions={screenOptions}>
        {!selectedLine ? (
          <Stack.Screen
            options={optionsWithCustomStyle}
            name="SelectLine"
            component={SelectLine}
          />
        ) : null}
        {!selectedDirection ? (
          <Stack.Screen
            options={optionsWithCustomStyle}
            name="SelectBound"
            component={SelectBound}
          />
        ) : null}
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="Main"
          component={Main}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="AppSettings"
          component={AppSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="ThemeSettings"
          component={ThemeSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="EnabledLanguagesSettings"
          component={EnabledLanguagesSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="Notification"
          component={NotificationSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="TrainType"
          component={TrainTypeSettings}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="SpecifyDestinationSettings"
          component={SpecifyDestinationSettingsScreen}
        />
      </Stack.Navigator>
    </Permitted>
  )
}

export default React.memo(MainStack)
