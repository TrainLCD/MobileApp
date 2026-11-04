import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import {
  getBackgroundLocationDiagnostics,
  type NativeBackgroundLocationDiagnostics,
} from './backgroundLocationDiagnostics';

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }));
const requireModule = jest.mocked(requireOptionalNativeModule);
const originalOS = Platform.OS;

afterEach(() => {
  Platform.OS = originalOS;
  jest.resetAllMocks();
  jest.useRealTimers();
});

it('copies native history even after returning to foreground', async () => {
  Platform.OS = 'ios';
  const native: NativeBackgroundLocationDiagnostics = {
    schemaVersion: 1,
    scope: 'process',
    capturedAtMs: 40_000,
    counts: { requested: 2, expired: 1, cancelled: 1 },
    lastEvents: {
      expired: { event: 'expired', atMs: 20_000, uptimeMs: 10_000 },
    },
    recentEvents: [
      {
        event: 'entered-foreground',
        atMs: 39_000,
        uptimeMs: 29_000,
        inBackground: false,
      },
    ],
  };
  const read = jest.fn().mockResolvedValue(native);
  requireModule.mockReturnValue({
    getTrainLCDBackgroundDiagnosticsAsync: read,
  });
  expect(await getBackgroundLocationDiagnostics()).toEqual({
    availability: 'available',
    native,
  });
  expect(read).toHaveBeenCalledTimes(1);
  expect(requireModule).toHaveBeenCalledWith('ExpoLocation');
});

it.each([null, {}])(
  'distinguishes old binaries from zero requests (%p)',
  async (module) => {
    Platform.OS = 'ios';
    requireModule.mockReturnValue(module);
    expect(await getBackgroundLocationDiagnostics()).toEqual({
      availability: 'unavailable',
      reason: 'native-method-missing',
    });
  }
);

it('does not call the iOS-only method on Android', async () => {
  Platform.OS = 'android';
  expect(await getBackgroundLocationDiagnostics()).toEqual({
    availability: 'unavailable',
    reason: 'unsupported-platform',
  });
  expect(requireModule).not.toHaveBeenCalled();
});

it('preserves copy availability when the native read rejects', async () => {
  Platform.OS = 'ios';
  requireModule.mockReturnValue({
    getTrainLCDBackgroundDiagnosticsAsync: jest
      .fn()
      .mockRejectedValue(new Error('bridge')),
  });
  expect(await getBackgroundLocationDiagnostics()).toEqual({
    availability: 'unavailable',
    reason: 'read-failed',
  });
});

it('preserves copy availability when native module lookup throws', async () => {
  Platform.OS = 'ios';
  requireModule.mockImplementation(() => {
    throw new Error('lookup');
  });
  expect(await getBackgroundLocationDiagnostics()).toEqual({
    availability: 'unavailable',
    reason: 'read-failed',
  });
});

it('finishes a stalled native read and handles a late rejection', async () => {
  jest.useFakeTimers();
  Platform.OS = 'ios';
  let rejectRead!: (reason: Error) => void;
  requireModule.mockReturnValue({
    getTrainLCDBackgroundDiagnosticsAsync: () =>
      new Promise((_, reject) => {
        rejectRead = reject;
      }),
  });
  const result = getBackgroundLocationDiagnostics();
  await jest.advanceTimersByTimeAsync(3000);
  expect(await result).toEqual({
    availability: 'unavailable',
    reason: 'read-timeout',
  });
  rejectRead(new Error('late failure'));
  await Promise.resolve();
  expect(jest.getTimerCount()).toBe(0);
});

it('clears the timeout after a successful native read', async () => {
  jest.useFakeTimers();
  Platform.OS = 'ios';
  const native = {
    schemaVersion: 2,
    scope: 'process',
    capturedAtMs: 1,
    counts: {},
    lastEvents: {},
    recentEvents: [],
  };
  requireModule.mockReturnValue({
    getTrainLCDBackgroundDiagnosticsAsync: () => Promise.resolve(native),
  });
  expect(await getBackgroundLocationDiagnostics()).toEqual({
    availability: 'available',
    native,
  });
  expect(jest.getTimerCount()).toBe(0);
});
