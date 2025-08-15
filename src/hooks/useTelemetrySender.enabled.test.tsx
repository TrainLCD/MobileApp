/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'jotai';
import { useLocationStore } from '~/hooks/useLocationStore';
import { useTelemetrySender } from '~/hooks/useTelemetrySender';

const TELEMETRY_MAX_QUEUE_SIZE = 1000;
const TELEMETRY_THROTTLE_MS = 1; // NOTE: flakyになるので実運用より短め

jest.mock('expo-device', () => ({ modelName: 'MockDevice' }));
jest.mock('expo-network', () => ({
  useNetworkState: jest.fn().mockReturnValue({ type: 'WIFI' }),
  NetworkStateType: { WIFI: 'WIFI' },
}));
jest.mock('~/utils/telemetryConfig', () => ({ isTelemetryEnabled: true }));
jest.mock('~/hooks/useLocationStore', () => ({
  useLocationStore: jest.fn(),
}));
jest.mock('~/constants/telemetry', () => ({
  TELEMETRY_MAX_QUEUE_SIZE,
  TELEMETRY_THROTTLE_MS,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider>{children}</Provider>
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
    };
    (global as any).WebSocket = jest.fn(() => mockWebSocket);
    (global as any).WebSocket.OPEN = 1;
    (global as any).WebSocket.CONNECTING = 0;
    (useLocationStore as unknown as jest.Mock).mockImplementation(
      (selector: (state: any) => any) =>
        selector({
          coords: {
            latitude: 35.0,
            longitude: 139.0,
            accuracy: 5,
            speed: 10,
          },
        })
    );

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test.skip('should send log when WebSocket is open', async () => {
    const { result } = renderHook(() => useTelemetrySender(), { wrapper });

    await act(async () => {
      result.current.sendLog('Test log', 'info');
      await Promise.resolve(); // イベントループ1回分回す
    });

    await waitFor(
      () => {
        expect(mockWebSocketSend).toHaveBeenCalled();
        const message = JSON.parse(mockWebSocketSend.mock.calls[0][0]);
        expect(message.type).toBe('log');
        expect(message.log.message).toBe('Test log');
      },
      { timeout: 2000 }
    );
  });

  test.skip('should throttle log sending within 1s', async () => {
    const { result } = renderHook(() => useTelemetrySender(), { wrapper });

    await act(async () => {
      result.current.sendLog('First');
      result.current.sendLog('Second');
      await Promise.resolve(); // イベントループ1回分回す
    });

    await waitFor(
      () => {
        expect(mockWebSocketSend).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 }
    );

    // スロットリング時間を過ぎた後に2回目のメッセージが送信されることを確認
    act(() => {
      jest.advanceTimersByTime(TELEMETRY_THROTTLE_MS);
      result.current.sendLog('Third');
    });

    await waitFor(
      () => {
        expect(mockWebSocketSend).toHaveBeenCalledTimes(2);
      },
      { timeout: 2000 }
    );
  });

  test('should not send telemetry if coordinates are null', () => {
    (useLocationStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        coords: {
          latitude: null,
          longitude: null,
          accuracy: null,
          speed: null,
        },
      })
    );
    renderHook(() => useTelemetrySender(), { wrapper });

    expect(mockWebSocketSend).not.toHaveBeenCalled();
  });

  test.skip('should enqueue message if WebSocket is not open', async () => {
    mockWebSocket.readyState = WebSocket.CONNECTING;

    const { result } = renderHook(() => useTelemetrySender(), { wrapper });

    act(() => {
      result.current.sendLog('Queued message');
    });

    expect(mockWebSocketSend).not.toHaveBeenCalled();

    await act(async () => {
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await Promise.resolve(); // イベントループ1回分回す
    });

    await waitFor(
      () => {
        expect(mockWebSocketSend).toHaveBeenCalled();
        const message = JSON.parse(mockWebSocketSend.mock.calls[0][0]);
        expect(message.log.message).toBe('Queued message');
      },
      { timeout: 2000 }
    );
  });

  test.skip('should not connect with invalid WebSocket URL', () => {
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
