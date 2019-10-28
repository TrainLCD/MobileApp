import * as Amplitude from 'expo-analytics-amplitude';
import { AMPLIFY_API_KEY } from 'react-native-dotenv';

Amplitude.initialize(AMPLIFY_API_KEY);

export default Amplitude;
