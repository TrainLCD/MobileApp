import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-device-info', () => mockRNDeviceInfo);

// Mock Firebase modules
jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn(),
  signInAnonymously: jest.fn(),
}));

jest.mock('@react-native-firebase/app', () => ({
  default: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/analytics', () => ({
  default: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  default: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/storage', () => ({
  default: jest.fn(() => ({})),
}));
