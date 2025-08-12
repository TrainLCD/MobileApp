import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('react-native-device-info', () => mockRNDeviceInfo);

// Mock Firebase modules with proper structure
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    name: '[DEFAULT]',
    options: {},
  })),
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn(),
  signInAnonymously: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/storage', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

// Mock Expo modules
jest.mock('expo-location', () => ({
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
}));

jest.mock('expo-localization', () => ({
  locale: 'en-US',
  locales: ['en-US'],
  timezone: 'America/New_York',
  isoCurrencyCodes: ['USD'],
  region: 'US',
  isRTL: false,
  getLocalizationAsync: jest.fn().mockResolvedValue({
    locale: 'en-US',
    locales: ['en-US'],
    timezone: 'America/New_York',
    isoCurrencyCodes: ['USD'],
    region: 'US',
    isRTL: false,
  }),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(),
  getRandomBytesAsync: jest.fn(),
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

jest.mock('expo-device', () => ({
  brand: 'Apple',
  designName: 'iPhone',
  deviceName: 'Test Device',
  deviceType: 1,
  deviceYearClass: 2020,
  isDevice: true,
  manufacturer: 'Apple',
  modelId: 'iPhone13,2',
  modelName: 'iPhone 12',
  osName: 'iOS',
  osVersion: '15.0',
  osBuildId: '19A344',
  platformApiLevel: null,
  productName: 'iPhone12,1',
  supportedCpuArchitectures: ['arm64'],
  totalMemory: 6000000000,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    platform: {
      ios: {},
      android: {},
    },
  },
}));

jest.mock('react-native-app-clip', () => ({
  isClip: false,
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-watch-connectivity
jest.mock('react-native-watch-connectivity', () => ({
  sendMessage: jest.fn(),
  updateApplicationContext: jest.fn(),
  useReachability: jest.fn(() => ({ installed: false, paired: false, reachable: false })),
  useMessageListener: jest.fn(),
  useApplicationContextListener: jest.fn(),
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
  };
});
