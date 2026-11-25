import { act, render } from '@testing-library/react-native';
import type { DeviceMotionMeasurement } from 'expo-sensors';
import { createStore, Provider } from 'jotai';
import { AppState } from 'react-native';
import { LineType, type Station } from '~/@types/graphql';
import { rememberTrackDistances } from '~/lib/trackDistances';
import { stationForHeaderAtom } from '~/store/atoms/navigation';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { DevImuArrival } from './DevImuArrival';

const mockTarget = { id: 2, line: { lineType: LineType.Subway } } as Station;
const mockRoute = {
  stops: [
    { stationId: 1, stopsHere: true },
    { stationId: 2, stopsHere: true },
  ],
};
let mockListener: ((data: DeviceMotionMeasurement) => void) | undefined;
const mockRemove = jest.fn();
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('~/hooks/useNextStation', () => ({
  useNextStation: () => mockTarget,
}));
jest.mock('~/hooks/useEstimateArrivalTimesRoute', () => ({
  useEstimateArrivalTimesRoute: () => ({ route: mockRoute }),
}));
jest.mock('~/lib/imuShadowSensor', () => ({
  ...jest.requireActual('~/lib/imuShadowSensor'),
  loadImuShadowSensor: async () => ({
    isAvailableAsync: async () => true,
    requestPermissionsAsync: async () => ({ granted: true }),
    setUpdateInterval: jest.fn(),
    addListener: (listener: typeof mockListener) => {
      mockListener = listener;
      return { remove: mockRemove };
    },
  }),
}));

it('starts at the origin without DO and advances on a complete subway stop', async () => {
  const store = createStore();
  const origin = { id: 1, line: { lineType: LineType.Subway } } as Station;
  store.set(stationAtom, origin);
  store.set(stationsAtom, [origin, mockTarget]);
  store.set(selectedDirectionAtom, 'INBOUND');
  store.set(selectedBoundAtom, mockTarget);
  rememberTrackDistances([
    { id: 1 },
    { id: 2, trackDistanceFromPrevious: 300 },
  ]);
  const previous = AppState.currentState;
  AppState.currentState = 'active';
  try {
    const view = render(
      <Provider store={store}>
        <DevImuArrival />
      </Provider>
    );
    await act(async () => {});
    expect(mockListener).toBeDefined();
    act(() => {
      mockListener?.({ acceleration: null } as DeviceMotionMeasurement);
      expect(mockRemove).not.toHaveBeenCalled();
      for (let n = 0; n <= 450; n++) {
        const x = n <= 100 ? 1 : n > 300 && n <= 400 ? -1 : 0;
        mockListener?.({
          acceleration: { x, y: 0, z: 0, timestamp: n / 10 },
          accelerationIncludingGravity: { x, y: 0, z: 9.81, timestamp: n / 10 },
          rotationRate: { alpha: 0, beta: 0, gamma: 0, timestamp: n / 10 },
        } as DeviceMotionMeasurement);
      }
    });
    expect(store.get(stationAtom)).toBe(mockTarget);
    expect(store.get(stationForHeaderAtom)).toBe(mockTarget);
    view.unmount();
    expect(mockRemove).toHaveBeenCalled();
  } finally {
    AppState.currentState = previous;
  }
});
