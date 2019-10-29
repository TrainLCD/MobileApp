import * as Amplitude from 'expo-analytics-amplitude';
import { Platform } from 'react-native';
import { AMPLIFY_API_KEY } from 'react-native-dotenv';

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  Amplitude.initialize(AMPLIFY_API_KEY);
}

export default Amplitude;
