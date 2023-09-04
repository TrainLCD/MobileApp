import { Platform } from 'react-native'

const FONTS = {
  FuturaLTPro: Platform.select({
    ios: 'Futura LT Pro',
    android: 'FuturaLTPro-Bold',
  }),
  MyriadPro: Platform.select({
    ios: 'Myriad Pro',
    android: 'myriadpro-bold',
  }),
  FrutigerNeueLTProBold: Platform.select({
    ios: 'Frutiger Neue LT Pro',
    android: 'FrutigerNeueLTPro-Bold',
  }),
  VerdanaBold: Platform.select({
    ios: 'Verdana Bold',
    android: 'verdana-bold',
  }),
  RobotoRegular: Platform.select({
    ios: 'Roboto-Regular',
    android: 'Roboto-Regular',
  }),
  RobotoBold: Platform.select({
    ios: 'Roboto-Bold',
    android: 'Roboto-Bold',
  }),
  JFDotJiskan24h: Platform.select({
    ios: 'JF Dot jiskan24h',
    android: 'JF-Dot-jiskan24h',
  }),
}

export default FONTS
