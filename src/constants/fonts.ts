import { Platform } from 'react-native';

export const FONTS = {
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
    ios: 'Roboto_400Regular',
    android: 'Roboto_400Regular',
  }),
  RobotoBold: Platform.select({
    ios: 'Roboto_700Bold',
    android: 'Roboto_700Bold',
  }),
  JFDotJiskan24h: Platform.select({
    ios: 'JF Dot jiskan24h',
    android: 'JF-Dot-jiskan24h',
  }),
};
