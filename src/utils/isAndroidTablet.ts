import { Platform, PlatformIOSStatic } from 'react-native';
import { isTablet } from 'react-native-device-info';

const { isPad } = Platform as PlatformIOSStatic;

export default isTablet() && !isPad;
