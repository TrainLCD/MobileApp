import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

process.env.TZ = 'UTC';

jest.mock('react-native-fs', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// https://github.com/facebookexperimental/Recoil/issues/904#issuecomment-823755253
if (!global.Window) {
  Object.defineProperty(global, 'Window', {
    value: window.constructor,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}
