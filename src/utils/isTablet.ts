import { Platform } from 'react-native';
import { isTablet } from 'react-native-device-info';

// Mac用
const isPad = Platform.OS === 'ios' ? Platform.isPad : undefined;

export default Platform.select({
  ios: isPad,
  android: isTablet(),
});
