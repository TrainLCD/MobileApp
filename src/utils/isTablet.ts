import { Platform, PlatformIOSStatic } from 'react-native';
import { isTablet } from 'react-native-device-info';

// Mac用
const { isPad } = Platform as PlatformIOSStatic;

export default isPad || isTablet();
