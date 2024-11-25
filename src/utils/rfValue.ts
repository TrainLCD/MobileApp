import { Dimensions, Platform, StatusBar } from 'react-native'
import { isIphoneX } from 'react-native-iphone-x-helper'

export function RFValue(fontSize: number, standardScreenHeight = 680) {
  const { height, width } = Dimensions.get('window')
  const standardLength = width > height ? width : height
  const offset =
    width > height
      ? 0
      : Platform.OS === 'ios'
      ? 78
      : StatusBar.currentHeight ?? 0

  const deviceHeight =
    isIphoneX() || Platform.OS === 'android'
      ? standardLength - offset
      : standardLength

  const heightPercent = (fontSize * deviceHeight) / standardScreenHeight
  return Math.round(heightPercent)
}
