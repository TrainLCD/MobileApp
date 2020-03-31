import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const isIPad = Platform.OS === 'ios' && Constants.platform.ios.userInterfaceIdiom === 'tablet';
