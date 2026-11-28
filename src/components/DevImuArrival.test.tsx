import { act, render } from '@testing-library/react-native';
import type { LocationObject } from 'expo-location';
import type { DeviceMotionMeasurement } from 'expo-sensors';
import { createStore, Provider } from 'jotai';
import { AppState, DeviceEventEmitter } from 'react-native';
import { LineType, type Station, TransportType } from '~/@types/graphql';
import type { RouteStop } from '~/lib/imuShadow';
import { ImuStopTrial, type StopTrialPhase } from '~/lib/imuStopTrial';
import { rememberTrackDistances } from '~/lib/trackDistances';
import {
  imuShadowEnabledAtom,
  recordedRidePhaseAtom,
} from '~/store/atoms/imuShadow';
import {
  backgroundLocationTrackingAtom,
  locationAtom,
} from '~/store/atoms/location';
import { stationForHeaderAtom } from '~/store/atoms/navigation';
import {
  arrivedAtom,
  displayArrivedAtom,
  selectedBoundAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { DevImuArrival } from './DevImuArrival';

let mockTarget = { id: 2, line: { lineType: LineType.Subway } } as Station;
let mockNextByOrigin: Map<number, Station> | null = null;
let mockHasRoute = true;
const mockRoute: { stops: RouteStop[] } = {
  stops: [
    { stationId: 1, stopsHere: true },
    { stationId: 2, stopsHere: true },
  ],
};
let mockListener: ((data: DeviceMotionMeasurement) => void) | undefined;
const mockRemove = jest.fn();
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('~/hooks/useNextStation', () => ({
  useNextStation: (_ignorePass: boolean, origin?: Station) =>
    mockNextByOrigin ? mockNextByOrigin.get(origin?.id ?? -1) : mockTarget,
}));
jest.mock('~/hooks/useEstimateArrivalTimesRoute', () => ({
  useEstimateArrivalTimesRoute: () => ({
    route: mockHasRoute ? mockRoute : null,
  }),
}));
jest.mock('~/lib/imuShadowSensor', () => ({
  ...jest.requireActual('~/lib/imuShadowSensor'),
  loadImuShadowSensor: async () => ({
    getPermissionsAsync: async () => ({ granted: true }),
    isAvailableAsync: async () => true,
    requestPermissionsAsync: async () => ({ granted: true }),
    setUpdateInterval: jest.fn(),
    addListener: (listener: typeof mockListener) => {
      mockListener = listener;
      return { remove: mockRemove };
    },
  }),
}));

beforeEach(() => {
  mockNextByOrigin = null;
  mockHasRoute = true;
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((event, listener) =>
      DeviceEventEmitter.addListener(event, listener)
    );
});

it.each([
  { recording: false, hasRoute: true },
  { recording: true, hasRoute: true },
  { recording: false, hasRoute: false },
  { recording: true, hasRoute: false },
  { recording: false, hasRoute: true, gap: true },
])(
  'uses guarded motion in station guidance (recording=$recording, ETA route=$hasRoute)',
  async ({ recording, hasRoute, gap }) => {
    const stops = [101, 102, 103].map(
      (id) => ({ id, line: { transportType: TransportType.Rail } }) as Station
    );
    mockNextByOrigin = new Map([
      [101, stops[1]],
      [102, stops[2]],
    ]);
    mockHasRoute = hasRoute;
    const previousStops = mockRoute.stops;
    mockRoute.stops = stops.map((s, i) => ({
      stationId: s.id,
      stopsHere: true,
      cumulativeMinutes: i,
      departureCumulativeMinutes: i,
    }));
    mockListener = undefined;
    const store = createStore();
    store.set(imuShadowEnabledAtom, recording);
    store.set(stationsAtom, stops);
    store.set(stationAtom, stops[0]);
    store.set(selectedBoundAtom, stops[2]);
    store.set(selectedDirectionAtom, 'INBOUND');
    if (recording)
      store.set(recordedRidePhaseAtom, { phase: 'running', timeMs: 1000 });
    const previous = AppState.currentState;
    AppState.currentState = 'active';
    let phase: StopTrialPhase = 'waiting';
    const step = jest
      .spyOn(ImuStopTrial.prototype, 'step')
      .mockImplementation((sample) => ({
        timeMs: sample.timeMs,
        guardedRestart: phase,
        baseline: 'waiting',
        magnetic: 'waiting',
        stopProbability: null,
        magneticSd: null,
        vetoEvidence: false,
      }));
    let lastTimeMs = 800;
    const send = async (next: StopTrialPhase, timeMs: number) => {
      await act(async () => {
        if (recording) {
          store.set(recordedRidePhaseAtom, { phase: next, timeMs });
        } else {
          for (let t = lastTimeMs + 100; t <= timeMs; t += 100) {
            if (t === timeMs) phase = next;
            const timestamp = t / 1000;
            mockListener?.({
              acceleration: { x: 0, y: 0, z: 0, timestamp },
              accelerationIncludingGravity: { x: 0, y: 0, z: 9.81, timestamp },
              rotationRate: { alpha: 0, beta: 0, gamma: 0, timestamp },
            } as DeviceMotionMeasurement);
          }
        }
        lastTimeMs = timeMs;
      });
    };
    const view = render(
      <Provider store={store}>
        <DevImuArrival />
      </Provider>
    );
    try {
      await act(async () => {});
      if (recording) expect(mockListener).toBeUndefined();
      else expect(mockListener).toBeDefined();
      if (!recording) {
        await send('stop', 900);
        expect(store.get(stationAtom)).toBe(stops[0]);
        await send('running', 1000);
      }
      expect(store.get(displayArrivedAtom)).toBe(false);
      await send('stop', 5000);
      expect(store.get(stationAtom)).toBe(stops[0]);
      expect(view.toJSON()).toBeNull();
      await send('running', 6000);
      if (gap) {
        act(() => store.set(arrivedAtom, false));
        lastTimeMs = 37000;
        await send('stop', 37100);
        expect(step.mock.lastCall?.[0].timeMs).toBe(37100);
        expect(store.get(stationAtom)).toBe(stops[0]);
        expect(view.toJSON()).toBeNull();
        const listenerBeforeRefresh = mockListener;
        await act(async () => store.set(stationsAtom, [...stops]));
        expect(mockListener).not.toBe(listenerBeforeRefresh);
        await send('running', 37200);
        await send('stop', 73500);
        expect(store.get(stationAtom)).toBe(stops[1]);
        expect(new Set(step.mock.instances).size).toBe(2);
        return;
      }
      await send('stop', 37500);
      if (!hasRoute) {
        expect(store.get(stationAtom)).toBe(stops[0]);
        expect(view.toJSON()).toBeNull();
        act(() =>
          store.set(locationAtom, { timestamp: Date.now() } as LocationObject)
        );
        expect(store.get(stationAtom)).toBe(stops[0]);
        return;
      }
      expect(store.get(stationAtom)).toBe(stops[1]);
      expect(store.get(stationForHeaderAtom)).toBe(stops[1]);
      await send('stop', 37600);
      expect(store.get(displayArrivedAtom)).toBe(true);
      await send('running', 38000);
      expect(store.get(displayArrivedAtom)).toBe(false);
      await send('stop', 75000);
      expect(store.get(stationAtom)).toBe(stops[2]);
      expect(store.get(stationForHeaderAtom)).toBe(stops[2]);
      // The normal ride keeps the same 24-second model history across the arrival.
      if (!recording) expect(new Set(step.mock.instances).size).toBe(1);
    } finally {
      view.unmount();
      mockRoute.stops = previousStops;
      AppState.currentState = previous;
    }
  }
);
afterEach(() => jest.restoreAllMocks());

it.each([
  { lineType: LineType.Subway, locked: false, tracking: false, advances: true },
  { lineType: LineType.Normal, locked: false, tracking: false, advances: true },
  { lineType: null, locked: true, tracking: true, advances: true },
  {
    lineType: LineType.Normal,
    locked: true,
    tracking: true,
    advances: true,
    targetType: LineType.Subway,
  },
  { lineType: LineType.Subway, locked: true, tracking: true, advances: true },
  { lineType: LineType.Subway, locked: true, tracking: false, advances: false },
  {
    lineType: LineType.Normal,
    locked: false,
    tracking: false,
    freshFix: true,
    advances: false,
  },
  {
    lineType: null,
    locked: false,
    tracking: false,
    sampleGap: true,
    advances: false,
  },
])(
  'replays a rail leg (type=$lineType, locked=$locked, tracking=$tracking, advances=$advances)',
  async ({
    locked,
    tracking,
    advances,
    lineType,
    targetType = lineType,
    freshFix,
    sampleGap,
  }) => {
    mockTarget = {
      id: 2,
      line: { lineType: targetType, transportType: TransportType.Rail },
    } as Station;
    mockListener = undefined;
    mockRemove.mockClear();
    const store = createStore();
    const origin = {
      id: 1,
      line: { lineType, transportType: TransportType.Rail },
    } as Station;
    store.set(backgroundLocationTrackingAtom, tracking);
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
      const sendSamples = (first: number, last: number) => {
        for (let n = first; n <= last; n++) {
          const x = n <= 100 ? 1 : n > 300 && n <= 400 ? -1 : 0;
          mockListener?.({
            acceleration: { x, y: 0, z: 0, timestamp: n / 10 },
            accelerationIncludingGravity: {
              x,
              y: 0,
              z: 9.81,
              timestamp: n / 10,
            },
            rotationRate: { alpha: 0, beta: 0, gamma: 0, timestamp: n / 10 },
          } as DeviceMotionMeasurement);
        }
      };
      act(() => {
        mockListener?.({ acceleration: null } as DeviceMotionMeasurement);
        expect(mockRemove).not.toHaveBeenCalled();
        sendSamples(0, 149);
      });
      expect(mockRemove).not.toHaveBeenCalled();
      expect(store.get(displayArrivedAtom)).toBe(false);
      expect(store.get(arrivedAtom)).toBe(true);
      if (locked) {
        act(() => {
          AppState.currentState = 'background';
          DeviceEventEmitter.emit('change', 'background');
        });
        if (tracking) expect(mockRemove).not.toHaveBeenCalled();
      }
      if (freshFix)
        store.set(locationAtom, { timestamp: Date.now() } as LocationObject);
      act(() => sendSamples(sampleGap ? 170 : 150, 450));
      if (sampleGap) {
        expect(mockRemove).not.toHaveBeenCalled();
        expect(store.get(displayArrivedAtom)).toBe(false);
      }
      if (locked && !tracking) {
        expect(mockRemove).toHaveBeenCalled();
        expect(store.get(displayArrivedAtom)).toBe(false);
        await act(async () => {
          AppState.currentState = 'active';
          DeviceEventEmitter.emit('change', 'active');
        });
        expect(store.get(displayArrivedAtom)).toBe(false);
        expect(store.get(arrivedAtom)).toBe(true);
      }
      expect(store.get(stationAtom)).toBe(advances ? mockTarget : origin);
      if (advances) expect(store.get(stationForHeaderAtom)).toBe(mockTarget);
      view.unmount();
      if (!advances) expect(store.get(displayArrivedAtom)).toBe(true);
      expect(mockRemove).toHaveBeenCalled();
    } finally {
      AppState.currentState = previous;
    }
  }
);

it.each([
  [null, TransportType.Rail],
  [TransportType.Rail, null],
  [TransportType.Bus, TransportType.Rail],
  [TransportType.Rail, TransportType.RailAndBus],
])(
  'skips motion for a leg with transport types %s and %s',
  async (from, to) => {
    const store = createStore();
    const origin = { id: 1, line: { transportType: from } } as Station;
    mockTarget = { id: 2, line: { transportType: to } } as Station;
    mockListener = undefined;
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
      expect(mockListener).toBeUndefined();
      expect(store.get(displayArrivedAtom)).toBe(true);
      view.unmount();
    } finally {
      AppState.currentState = previous;
    }
  }
);
