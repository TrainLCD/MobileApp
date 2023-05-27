import { Dimensions, Platform } from 'react-native';
import { isTablet } from 'react-native-device-info';

export default Platform.select({
  ios: false,
  android: isTablet() && Dimensions.get('window').height < 768,
});
