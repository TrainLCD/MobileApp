import { act, fireEvent, render } from '@testing-library/react-native';
import * as Battery from 'expo-battery';
import type { DeviceMotionMeasurement } from 'expo-sensors';
import { createStore, Provider } from 'jotai';
import { AppState } from 'react-native';
import type { Station } from '~/@types/graphql';
import type { RouteStop } from '~/lib/imuShadow';
import { getLastImuShadowRecording } from '~/lib/imuShadowRecording';
import { etaAnchorAtom } from '~/store/atoms/etaFallback';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  arrivedAtom,
  selectedBoundAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { exportImuShadow } from '~/utils/exportImuShadow';
import { ImuShadowPanel } from './ImuShadowPanel';

let mockReceive: ((data: DeviceMotionMeasurement) => void) | undefined;
let mockLoadGate: Promise<void> | undefined;
const mockIsAvailable = jest.fn(async () => true);
const mockRequestPermissions = jest.fn(async () => ({ granted: true }));
let mockRouteStops: RouteStop[] | undefined;

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
      stops: mockRouteStops ?? [
        { stationId: 1, stopsHere: true, departureCumulativeMinutes: 0 },
        {
          stationId: 2,
          stopsHere: true,
          cumulativeMinutes: 1,
          departureCumulativeMinutes: 1,
        },
        { stationId: 3, stopsHere: true, cumulativeMinutes: 2 },
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
const mockWriteRecording = jest.fn();
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'cache' },
  File: jest.fn(() => ({
    uri: 'file:///imu.json',
    writeSync: mockWriteRecording,
  })),
}));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(async () => undefined) },
}));
jest.mock('~/utils/exportImuShadow', () => ({
  exportImuShadow: jest.fn(
    jest.requireActual('~/utils/exportImuShadow').exportImuShadow
  ),
}));

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
      fireEvent.press(screen.getByText('Finish & export'));
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

test('starts automatically at a known stopped station and advances after a single arrival tap', async () => {
  jest.useFakeTimers();
  const originalState = AppState.currentState;
  AppState.currentState = 'active';
  mockReceive = undefined;
  mockRequestPermissions.mockClear();
  jest.mocked(exportImuShadow).mockClear();
  const store = createStore();
  store.set(stationAtom, { id: 1 } as Station);
  store.set(selectedBoundAtom, { id: 3 } as Station);
  store.set(selectedDirectionAtom, 'INBOUND');
  store.set(arrivedAtom, true);
  try {
    const screen = render(
      <Provider store={store}>
        <ImuShadowPanel />
      </Provider>
    );
    await act(async () => {});
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(mockReceive).toBeDefined();
    expect(getLastImuShadowRecording()?.legs[0]?.leg).toMatchObject({
      fromId: 1,
      toId: 2,
    });
    expect(screen.queryByText('Actual departure')).toBeNull();
    expect(screen.queryByText('Next leg')).toBeNull();
    for (let i = 1; i <= 16; i++) {
      act(() => {
        jest.advanceTimersByTime(100);
        const timestamp = i / 10;
        mockReceive?.({
          acceleration: { x: 1, y: 0, z: 0, timestamp },
          accelerationIncludingGravity: { x: 1, y: 0, z: 9.81, timestamp },
          rotation: { alpha: 0, beta: 0, gamma: 0, timestamp },
          rotationRate: { alpha: 0, beta: 0, gamma: 0, timestamp },
          interval: 100,
          orientation: 0,
        });
      });
    }
    const recording = getLastImuShadowRecording();
    expect(
      recording?.events.filter((event) => event.kind === 'departure')
    ).toEqual([
      expect.objectContaining({
        departureSource: 'imu',
        stationId: 1,
        legIndex: 0,
      }),
    ]);
    await act(async () => {
      fireEvent.press(screen.getByText('Actual next arrival'));
    });
    expect(
      recording?.events.filter((event) => event.kind === 'arrival')
    ).toEqual([expect.objectContaining({ stationId: 2, legIndex: 0 })]);
    expect(screen.getByText('Advancing to next leg')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(recording?.legs.map(({ leg }) => [leg.fromId, leg.toId])).toEqual([
      [1, 2],
      [2, 3],
    ]);
    expect(screen.getByText('Actual next arrival')).toBeTruthy();
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.press(screen.getByText('Finish & export'));
    });
    expect(recording?.endedAtMs).not.toBeNull();
    expect(exportImuShadow).toHaveBeenCalledTimes(1);
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    screen.unmount();
  } finally {
    AppState.currentState = originalState;
    jest.restoreAllMocks();
    jest.useRealTimers();
  }
});

test('waits for a known stopped station instead of starting on the wrong leg', async () => {
  const originalState = AppState.currentState;
  AppState.currentState = 'active';
  mockReceive = undefined;
  mockRequestPermissions.mockClear();
  const store = createStore();
  store.set(selectedBoundAtom, { id: 3 } as Station);
  store.set(selectedDirectionAtom, 'INBOUND');
  store.set(arrivedAtom, false);
  try {
    const screen = render(
      <Provider store={store}>
        <ImuShadowPanel />
      </Provider>
    );
    await act(async () => {});
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    await act(async () => {
      store.set(stationAtom, { id: 2 } as Station);
    });
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    await act(async () => {
      store.set(arrivedAtom, true);
    });
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(getLastImuShadowRecording()?.legs[0]?.leg).toMatchObject({
      fromId: 2,
      toId: 3,
    });
    screen.unmount();
  } finally {
    AppState.currentState = originalState;
    mockRequestPermissions.mockClear();
  }
});

test.each(['load', 'availability', 'permission'] as const)(
  'automatic start rechecks the station after %s and waits for the next stop',
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
    if (stage === 'load') mockLoadGate = gate;
    if (stage === 'availability')
      mockIsAvailable.mockImplementationOnce(async () => {
        await gate;
        return true;
      });
    if (stage === 'permission')
      mockRequestPermissions.mockImplementationOnce(async () => {
        await gate;
        return { granted: true };
      });
    const store = createStore();
    store.set(stationAtom, { id: 1 } as Station);
    store.set(selectedBoundAtom, { id: 3 } as Station);
    store.set(selectedDirectionAtom, 'INBOUND');
    store.set(arrivedAtom, true);
    const previousRecording = getLastImuShadowRecording();
    try {
      const screen = render(
        <Provider store={store}>
          <ImuShadowPanel />
        </Provider>
      );
      await act(async () => {});
      await act(async () => {
        store.set(arrivedAtom, false);
        store.set(stationAtom, { id: 2 } as Station);
      });
      await act(async () => {
        release();
      });
      expect(getLastImuShadowRecording()).toBe(previousRecording);
      expect(mockReceive).toBeUndefined();
      expect(mockRequestPermissions).toHaveBeenCalledTimes(
        stage === 'permission' ? 1 : 0
      );
      await act(async () => {
        store.set(arrivedAtom, true);
      });
      expect(getLastImuShadowRecording()?.legs[0]?.leg).toMatchObject({
        fromId: 2,
        toId: 3,
      });
      expect(mockReceive).toBeDefined();
      screen.unmount();
    } finally {
      release();
      mockLoadGate = undefined;
      AppState.currentState = originalState;
      mockIsAvailable.mockClear();
      mockRequestPermissions.mockClear();
    }
  }
);

test('automatic start retries when a new stopped station was rendered before permission resolves', async () => {
  const originalState = AppState.currentState;
  AppState.currentState = 'active';
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  mockRequestPermissions.mockImplementationOnce(async () => {
    await gate;
    return { granted: true };
  });
  const store = createStore();
  store.set(stationAtom, { id: 1 } as Station);
  store.set(selectedBoundAtom, { id: 3 } as Station);
  store.set(selectedDirectionAtom, 'INBOUND');
  try {
    const screen = render(
      <Provider store={store}>
        <ImuShadowPanel />
      </Provider>
    );
    await act(async () => {});
    await act(async () => {
      store.set(stationAtom, { id: 2 } as Station);
    });
    await act(async () => {
      release();
    });
    expect(getLastImuShadowRecording()?.legs[0]?.leg).toMatchObject({
      fromId: 2,
      toId: 3,
    });
    screen.unmount();
  } finally {
    release();
    AppState.currentState = originalState;
  }
});

test('manual start preserves the explicitly selected station after permission resolves', async () => {
  const originalState = AppState.currentState;
  AppState.currentState = 'active';
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  mockRequestPermissions.mockImplementationOnce(async () => {
    await gate;
    return { granted: true };
  });
  const store = createStore();
  store.set(stationAtom, { id: 1 } as Station);
  try {
    const screen = render(
      <Provider store={store}>
        <ImuShadowPanel />
      </Provider>
    );
    await act(async () => {
      fireEvent.press(screen.getByText('Record IMU'));
    });
    await act(async () => {
      store.set(stationAtom, { id: 2 } as Station);
      store.set(arrivedAtom, false);
    });
    await act(async () => {
      release();
    });
    expect(getLastImuShadowRecording()?.legs[0]?.leg).toMatchObject({
      fromId: 1,
      toId: 2,
    });
    screen.unmount();
  } finally {
    release();
    AppState.currentState = originalState;
  }
});

test('export after terminal auto-stop waits for the final battery sample', async () => {
  jest.useFakeTimers();
  const originalState = AppState.currentState;
  AppState.currentState = 'active';
  mockWriteRecording.mockClear();
  const store = createStore();
  store.set(stationAtom, { id: 2 } as Station);
  store.set(selectedBoundAtom, { id: 3 } as Station);
  store.set(selectedDirectionAtom, 'INBOUND');
  let release!: (level: number) => void;
  const gate = new Promise<number>((resolve) => {
    release = resolve;
  });
  try {
    const screen = render(
      <Provider store={store}>
        <ImuShadowPanel />
      </Provider>
    );
    await act(async () => {});
    const recording = getLastImuShadowRecording();
    expect(recording?.battery).toHaveLength(1);
    jest
      .mocked(Battery.getBatteryLevelAsync)
      .mockImplementationOnce(() => gate);
    await act(async () => {
      fireEvent.press(screen.getByText('Actual next arrival'));
    });
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(recording?.endReason).toBe('terminal');
    await act(async () => {
      fireEvent.press(screen.getByText('Export JSON'));
    });
    expect(mockWriteRecording).not.toHaveBeenCalled();
    await act(async () => {
      release(0.75);
    });
    expect(mockWriteRecording).toHaveBeenCalledTimes(1);
    const data = JSON.parse(mockWriteRecording.mock.calls[0][0]);
    expect(data.battery).toHaveLength(2);
    expect(data.battery.at(-1).level).toBe(0.75);
    screen.unmount();
  } finally {
    release(0.75);
    AppState.currentState = originalState;
    jest.useRealTimers();
  }
});

test.each([1, 2, 3])(
  'circular route only auto-starts at the unambiguous intermediate station: %s',
  async (stationId) => {
    const originalState = AppState.currentState;
    AppState.currentState = 'active';
    mockReceive = undefined;
    mockRequestPermissions.mockClear();
    mockRouteStops = [
      {
        stationId: 1,
        stationGroupId: 10,
        stopsHere: true,
        departureCumulativeMinutes: 0,
      },
      {
        stationId: 2,
        stationGroupId: 20,
        stopsHere: true,
        cumulativeMinutes: 1,
        departureCumulativeMinutes: 1,
      },
      {
        stationId: 3,
        stationGroupId: 10,
        stopsHere: true,
        cumulativeMinutes: 2,
      },
    ];
    const store = createStore();
    store.set(stationAtom, {
      id: stationId,
      groupId: stationId === 2 ? 20 : 10,
    } as Station);
    store.set(selectedBoundAtom, { id: 3 } as Station);
    store.set(selectedDirectionAtom, 'INBOUND');
    const previous = getLastImuShadowRecording();
    try {
      const screen = render(
        <Provider store={store}>
          <ImuShadowPanel />
        </Provider>
      );
      await act(async () => {});
      if (stationId === 2) {
        expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
        expect(getLastImuShadowRecording()?.legs[0]?.leg).toMatchObject({
          fromId: 2,
          toId: 3,
        });
      } else {
        expect(mockRequestPermissions).not.toHaveBeenCalled();
        expect(getLastImuShadowRecording()).toBe(previous);
        expect(mockReceive).toBeUndefined();
      }
      screen.unmount();
    } finally {
      mockRouteStops = undefined;
      AppState.currentState = originalState;
    }
  }
);

test.each(['observed-origin', 'stations-list', 'other-group'] as const)(
  'maps the location departure anchor to the route origin only for the same station group: %s',
  async (source) => {
    jest.useFakeTimers();
    const originalState = AppState.currentState;
    AppState.currentState = 'active';
    mockRouteStops = [
      {
        stationId: 100,
        stationGroupId: 10,
        stopsHere: true,
        departureCumulativeMinutes: 0,
      },
      {
        stationId: 300,
        stationGroupId: 30,
        stopsHere: true,
        cumulativeMinutes: 1,
      },
    ];
    const store = createStore();
    store.set(stationAtom, {
      id: source === 'observed-origin' ? 200 : 100,
      groupId: 10,
    } as Station);
    store.set(selectedBoundAtom, { id: 300 } as Station);
    store.set(selectedDirectionAtom, 'INBOUND');
    if (source !== 'observed-origin') {
      store.set(stationsAtom, [
        { id: 200, groupId: source === 'stations-list' ? 10 : 20 } as Station,
      ]);
    }
    try {
      const screen = render(
        <Provider store={store}>
          <ImuShadowPanel />
        </Provider>
      );
      await act(async () => {});
      const recording = getLastImuShadowRecording();
      expect(recording?.legs[0]?.leg.fromId).toBe(100);
      // The last arrived station can change before the periodic observation.
      await act(async () => {
        store.set(stationAtom, { id: 300, groupId: 30 } as Station);
        store.set(arrivedAtom, false);
        store.set(etaAnchorAtom, {
          kind: 'DEPARTED',
          stationId: 200,
          observedAtMs: Date.now(),
        });
        jest.advanceTimersByTime(1000);
      });
      const departures = recording?.events.filter(
        (event) => event.kind === 'departure'
      );
      if (source === 'other-group') {
        expect(departures).toEqual([]);
      } else {
        expect(departures).toEqual([
          expect.objectContaining({
            stationId: 100,
            departureSource: 'location',
          }),
        ]);
      }
      screen.unmount();
    } finally {
      mockRouteStops = undefined;
      AppState.currentState = originalState;
      jest.useRealTimers();
    }
  }
);
