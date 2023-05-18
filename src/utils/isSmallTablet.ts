import { PixelRatio, Platform } from 'react-native';
import { isTablet } from 'react-native-device-info';

export default Platform.select({
  ios: false,
  android: isTablet() && PixelRatio.get() < 3,
});
