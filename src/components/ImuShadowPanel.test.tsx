import { act, fireEvent, render } from '@testing-library/react-native';
import type { DeviceMotionMeasurement } from 'expo-sensors';
import { createStore, Provider } from 'jotai';
import { AppState } from 'react-native';
import { getLastImuShadowRecording } from '~/lib/imuShadowRecording';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import { ImuShadowPanel } from './ImuShadowPanel';

let mockReceive: ((data: DeviceMotionMeasurement) => void) | undefined;
let mockLoadGate: Promise<void> | undefined;
const mockIsAvailable = jest.fn(async () => true);
const mockRequestPermissions = jest.fn(async () => ({ granted: true }));

jest.mock('~/lib/imuShadowSensor', () => ({
  loadImuShadowSensor: async () => {
    if (mockLoadGate) await mockLoadGate;
    return {
      isAvailableAsync: mockIsAvailable,
      requestPermissionsAsync: mockRequestPermissions,
      setUpdateInterval: jest.fn(),
      addListener: (listener: (data: DeviceMotionMeasurement) => void) => {
        mockReceive = listener;
        return { remove: jest.fn() };
      },
    };
  },
}));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));
jest.mock('expo-battery', () => ({
  getBatteryLevelAsync: jest.fn(async () => 1),
  getBatteryStateAsync: jest.fn(async () => 1),
}));
jest.mock('~/components/Typography', () => ({
  __esModule: true,
  default: jest.requireActual('react-native').Text,
}));
jest.mock('~/hooks/useEstimateArrivalTimesRoute', () => ({
  useEstimateArrivalTimesRoute: () => ({
    route: {
      id: 1,
      stops: [
        { stationId: 1, stopsHere: true, departureCumulativeMinutes: 0 },
        { stationId: 2, stopsHere: true, cumulativeMinutes: 1 },
      ],
    },
  }),
}));
jest.mock('~/hooks/useThreshold', () => ({
  useThreshold: () => ({ arrivedThreshold: 100 }),
}));
jest.mock('~/lib/trackDistances', () => ({ getTrackDistance: () => 300 }));
jest.mock('~/translation', () => ({ isJapanese: false }));
jest.mock('~/utils/etaPhaseNow', () => ({ getEtaPhaseNow: () => null }));
jest.mock('~/utils/exportImuShadow', () => ({ exportImuShadow: jest.fn() }));

test('stopping between ticks shows the same invalid estimate as the final observation', async () => {
  jest.useFakeTimers();
  const originalState = AppState.currentState;
  AppState.currentState = 'active';
  let receiptTime = 0;
  jest.spyOn(performance, 'now').mockImplementation(() => receiptTime);
  const store = createStore();
  store.set(autoModeEnabledAtom, false);
  try {
    const screen = render(
      <Provider store={store}>
        <ImuShadowPanel />
      </Provider>
    );
    await act(async () => {
      fireEvent.press(screen.getByText('Record IMU'));
    });
    expect(mockReceive).toBeDefined();
    act(() => {
      receiptTime = 100;
      mockReceive?.({
        acceleration: { x: 0, y: 0, z: 0, timestamp: 100 },
        accelerationIncludingGravity: { x: 0, y: 0, z: 9.81, timestamp: 100 },
        rotation: { alpha: 0, beta: 0, gamma: 0, timestamp: 100 },
        rotationRate: { alpha: 0, beta: 0, gamma: 0, timestamp: 100 },
        interval: 100,
        orientation: 0,
      });
    });
    expect(screen.getByText('WAITING')).toBeTruthy();
    await act(async () => {
      receiptTime = 601;
      fireEvent.press(screen.getByText('Stop'));
    });
    expect(screen.getByText('INVALID')).toBeTruthy();
    expect(
      getLastImuShadowRecording()?.observations.at(-1)?.estimate
    ).toMatchObject({
      phase: 'invalid',
      reason: 'sample-gap',
      arrivalCandidate: false,
    });
    screen.unmount();
  } finally {
    AppState.currentState = originalState;
    jest.restoreAllMocks();
    jest.useRealTimers();
  }
});

test.each(['load', 'availability'] as const)(
  'cancelling during %s prevents a permission request',
  async (stage) => {
    const originalState = AppState.currentState;
    AppState.currentState = 'active';
    mockReceive = undefined;
    mockIsAvailable.mockClear();
    mockRequestPermissions.mockClear();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    if (stage === 'load') {
      mockLoadGate = gate;
    } else {
      mockIsAvailable.mockImplementationOnce(async () => {
        await gate;
        return true;
      });
    }
    const store = createStore();
    store.set(autoModeEnabledAtom, false);
    try {
      const screen = render(
        <Provider store={store}>
          <ImuShadowPanel />
        </Provider>
      );
      await act(async () => {
        fireEvent.press(screen.getByText('Record IMU'));
      });
      expect(mockIsAvailable).toHaveBeenCalledTimes(stage === 'load' ? 0 : 1);
      expect(mockRequestPermissions).not.toHaveBeenCalled();
      if (stage === 'load') {
        screen.unmount();
      } else {
        await act(async () => {
          store.set(autoModeEnabledAtom, true);
        });
      }
      await act(async () => {
        release();
      });
      expect(mockIsAvailable).toHaveBeenCalledTimes(stage === 'load' ? 0 : 1);
      expect(mockRequestPermissions).not.toHaveBeenCalled();
      expect(mockReceive).toBeUndefined();
      if (stage === 'availability') screen.unmount();
    } finally {
      release();
      mockLoadGate = undefined;
      AppState.currentState = originalState;
      mockIsAvailable.mockClear();
      mockRequestPermissions.mockClear();
    }
  }
);
