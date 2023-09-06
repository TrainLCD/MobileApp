import { createStackNavigator } from '@react-navigation/stack'
import React, { useMemo } from 'react'
import Layout from '../components/Layout'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import AppSettings from '../screens/AppSettings'
import ThemeSettings from '../screens/AppSettings/ThemeSettings'
import EnabledLanguagesSettings from '../screens/EnabledLanguagesSettings'
import Main from '../screens/Main'
import NotificationSettings from '../screens/NotificationSettingsScreen'
import SelectBound from '../screens/SelectBound'
import SelectLine from '../screens/SelectLine'
import TrainTypeSettings from '../screens/TrainTypeSettingsScreen'

const Stack = createStackNavigator()

const screenOptions = {
  headerShown: false,
}
const options = {
  animationEnabled: false,
  cardStyle: {
    opacity: 1,
  },
}

const MainStack: React.FC = () => {
  const isLEDTheme = useIsLEDTheme()

  const optionsWithCustomStyle = useMemo(
    () => ({
      ...options,
      cardStyle: {
        ...options.cardStyle,
        backgroundColor: isLEDTheme ? '#212121' : '#fff',
      },
    }),
    [isLEDTheme]
  )

  return (
    <Layout>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="SelectLine"
          component={SelectLine}
        />
        <Stack.Screen
          options={optionsWithCustomStyle}
          name="SelectBound"
          component={SelectBound}
        />
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
      </Stack.Navigator>
    </Layout>
  )
}

export default React.memo(MainStack)
