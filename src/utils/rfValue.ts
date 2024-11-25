import { Dimensions, Platform, StatusBar } from 'react-native'
import { hasNotch } from 'react-native-device-info'

export const RFValue = (fontSize: number, standardScreenHeight = 680) => {
  const { height, width } = Dimensions.get('window')
  const standardLength = width > height ? width : height
  const offset =
    (width > height
      ? 0
      : Platform.OS === 'ios'
      ? 78
      : StatusBar.currentHeight) ?? 0

  const deviceHeight =
    hasNotch() || Platform.OS === 'android'
      ? standardLength - offset
      : standardLength

  const heightPercent = (fontSize * deviceHeight) / standardScreenHeight
  return Math.round(heightPercent)
}
