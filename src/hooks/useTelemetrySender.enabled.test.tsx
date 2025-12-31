/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Provider, useAtomValue } from 'jotai';
import { useCurrentLine } from '~/hooks/useCurrentLine';
import { useCurrentStation } from '~/hooks/useCurrentStation';
import { useIsPassing } from '~/hooks/useIsPassing';
import { useTelemetryEnabled } from '~/hooks/useTelemetryEnabled';
import { useTelemetrySender } from '~/hooks/useTelemetrySender';
import stationState from '~/store/atoms/station';

const TELEMETRY_MAX_QUEUE_SIZE = 1000;
const TELEMETRY_THROTTLE_MS = 1; // NOTE: flakyになるので実運用より短め

jest.mock('expo-device', () => ({ modelName: 'MockDevice' }));
jest.mock('expo-network', () => ({
  useNetworkState: jest.fn().mockReturnValue({ type: 'WIFI' }),
  NetworkStateType: { WIFI: 'WIFI' },
}));
jest.mock('~/utils/telemetryConfig', () => ({
  isTelemetryEnabledByBuild: true,
}));
jest.mock('react-native-dotenv', () => ({
  EXPERIMENTAL_TELEMETRY_ENDPOINT_URL: 'ws://example.com:8080',
  EXPERIMENTAL_TELEMETRY_TOKEN: 'test-token',
}));
jest.mock('jotai', () => {
  const actual = jest.requireActual('jotai');
  return {
    ...actual,
    useAtomValue: jest.fn(),
  };
});
jest.mock('~/constants/telemetry', () => ({
  TELEMETRY_MAX_QUEUE_SIZE,
  TELEMETRY_THROTTLE_MS,
}));
jest.mock('~/hooks/useCurrentLine', () => ({
  useCurrentLine: jest.fn(),
}));
jest.mock('~/hooks/useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));
jest.mock('~/hooks/useIsPassing', () => ({
  useIsPassing: jest.fn(),
}));
jest.mock('~/hooks/useTelemetryEnabled', () => ({
  useTelemetryEnabled: jest.fn(),
}));
jest.mock('~/utils/native/android/gnssModule', () => ({
  subscribeGnss: jest.fn((_callback) => {
    // No-op for tests
    return () => {};
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider
    // @ts-expect-error - initialValues is valid for jotai Provider but types are not up to date
    initialValues={[
      [
        stationState,
        {
          arrived: false,
          approaching: false,
          station: null,
          stations: [],
          stationsCache: [],
          pendingStation: null,
          pendingStations: [],
          selectedDirection: null,
          selectedBound: null,
          wantedDestination: null,
        },
      ],
    ]}
  >
    {children}
  </Provider>
);

let mockWebSocketSend: jest.Mock;
let mockWebSocket: any;

describe('useTelemetrySender', () => {
  beforeEach(() => {
    mockWebSocketSend = jest.fn();
    mockWebSocket = {
      send: mockWebSocketSend,
      close: jest.fn(),
      readyState: 1, // WebSocket.OPEN
      onopen: null,
      onclose: null,
      onerror: null,
    };
    (global as any).WebSocket = jest.fn(() => mockWebSocket);
    (global as any).WebSocket.OPEN = 1;
    (global as any).WebSocket.CONNECTING = 0;
    (useAtomValue as jest.Mock).mockReturnValue({
      latitude: 35.0,
      longitude: 139.0,
      accuracy: 5,
      speed: 10,
    });

    // Mock hooks that useTelemetrySender depends on
    (useCurrentLine as jest.Mock).mockReturnValue({ id: 11302 });
    (useCurrentStation as jest.Mock).mockReturnValue({ id: 1130224 });
    (useIsPassing as jest.Mock).mockReturnValue(false);
    (useTelemetryEnabled as jest.Mock).mockReturnValue(true);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('should send log when WebSocket is open', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'ws://example.com:8080'),
      { wrapper }
    );

    // Trigger WebSocket onopen
    await act(async () => {
      mockWebSocket.onopen?.();
      await Promise.resolve();
    });

    await act(async () => {
      result.current.sendLog('Test log from the app', 'info');
      await Promise.resolve(); // イベントループ1回分回す
    });

    await waitFor(
      () => {
        expect(mockWebSocketSend).toHaveBeenCalled();
        const calls = mockWebSocketSend.mock.calls;
        const logCall = calls.find((call: any[]) => {
          const message = JSON.parse(call[0]);
          return message.log?.message === 'Test log from the app';
        });
        expect(logCall).toBeDefined();
        const message = JSON.parse(logCall[0]);
        expect(message.type).toBe('log');
        expect(message.log.message).toBe('Test log from the app');
      },
      { timeout: 2000 }
    );
  });

  test('should throttle log sending within 1s', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'ws://example.com:8080'),
      { wrapper }
    );

    // Trigger WebSocket onopen
    await act(async () => {
      mockWebSocket.onopen?.();
      await Promise.resolve();
    });

    // Clear the initial connection message
    mockWebSocketSend.mockClear();

    await act(async () => {
      result.current.sendLog('First');
      result.current.sendLog('Second');
      await Promise.resolve(); // イベントループ1回分回す
    });

    await waitFor(
      () => {
        expect(mockWebSocketSend).toHaveBeenCalledTimes(2);
      },
      { timeout: 2000 }
    );

    // スロットリング時間を過ぎた後に3回目のメッセージが送信されることを確認
    act(() => {
      jest.advanceTimersByTime(TELEMETRY_THROTTLE_MS);
      result.current.sendLog('Third');
    });

    await waitFor(
      () => {
        expect(mockWebSocketSend).toHaveBeenCalledTimes(3);
      },
      { timeout: 2000 }
    );
  });

  test('should not send telemetry if coordinates are null', () => {
    (useAtomValue as jest.Mock)
      .mockReturnValueOnce(null) // locationAtom (coords will be undefined)
      .mockReturnValue({ arrived: false, approaching: false }); // stationState
    renderHook(() => useTelemetrySender(false, 'ws://example.com:8080'), {
      wrapper,
    });

    expect(mockWebSocketSend).not.toHaveBeenCalled();
  });

  test('should enqueue message if WebSocket is not open', async () => {
    mockWebSocket.readyState = (global as any).WebSocket.CONNECTING;

    const { result } = renderHook(
      () => useTelemetrySender(false, 'ws://example.com:8080'),
      { wrapper }
    );

    act(() => {
      result.current.sendLog('Queued message');
    });

    expect(mockWebSocketSend).not.toHaveBeenCalled();

    await act(async () => {
      mockWebSocket.readyState = (global as any).WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await Promise.resolve(); // イベントループ1回分回す
    });

    await waitFor(
      () => {
        expect(mockWebSocketSend).toHaveBeenCalled();
        const calls = mockWebSocketSend.mock.calls;
        const logCall = calls.find((call: any[]) => {
          const message = JSON.parse(call[0]);
          return message.log?.message === 'Queued message';
        });
        expect(logCall).toBeDefined();
        const message = JSON.parse(logCall[0]);
        expect(message.log.message).toBe('Queued message');
      },
      { timeout: 2000 }
    );
  });

  test('should not connect with invalid WebSocket URL', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    renderHook(() => useTelemetrySender(false, 'invalid-url'), { wrapper });
    expect(spy).toHaveBeenCalledWith('Invalid WebSocket URL');
    spy.mockRestore();
  });

  it('should add a message to an empty queue', () => {
    const queue: string[] = [];
    const enqueue = (q: string[], msg: string) => {
      q.push(msg);
      if (q.length > TELEMETRY_MAX_QUEUE_SIZE) q.shift();
    };

    enqueue(queue, 'msg1');
    expect(queue).toEqual(['msg1']);
  });

  it('should not remove anything if under TELEMETRY_MAX_QUEUE_SIZE', () => {
    const queue = Array.from(
      { length: TELEMETRY_MAX_QUEUE_SIZE - 1 },
      (_, i) => `msg${i}`
    );
    const enqueue = (q: string[], msg: string) => {
      q.push(msg);
      if (q.length > TELEMETRY_MAX_QUEUE_SIZE) q.shift();
    };

    enqueue(queue, 'new');
    expect(queue.length).toBe(TELEMETRY_MAX_QUEUE_SIZE);
    expect(queue[queue.length - 1]).toBe('new');
  });

  it('should remove oldest item if TELEMETRY_MAX_QUEUE_SIZE is exceeded', () => {
    const queue = Array.from(
      { length: TELEMETRY_MAX_QUEUE_SIZE },
      (_, i) => `msg${i}`
    );
    const enqueue = (q: string[], msg: string) => {
      q.push(msg);
      if (q.length > TELEMETRY_MAX_QUEUE_SIZE) q.shift();
    };

    enqueue(queue, 'latest');
    expect(queue.length).toBe(TELEMETRY_MAX_QUEUE_SIZE);
    expect(queue[0]).toBe('msg1'); // msg0 was removed
    expect(queue[queue.length - 1]).toBe('latest');
  });
});
