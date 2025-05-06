import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTelemetrySender } from '~/hooks/useTelemetrySender';
import { useLocationStore } from '~/hooks/useLocationStore';
import { RecoilRoot } from 'recoil';

jest.mock('expo-device', () => ({ modelName: 'MockDevice' }));
jest.mock('~/utils/telemetryConfig', () => ({ isTelemetryEnabled: true }));
jest.mock('~/hooks/useLocationStore', () => ({
  useLocationStore: jest.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <RecoilRoot>{children}</RecoilRoot>
);

let mockWebSocketSend: jest.Mock;
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
let mockWebSocket: any;

beforeEach(() => {
  mockWebSocketSend = jest.fn();
  mockWebSocket = {
    send: mockWebSocketSend,
    close: jest.fn(),
    readyState: 1, // WebSocket.OPEN
  };
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (global as any).WebSocket = jest.fn(() => mockWebSocket);
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (global as any).WebSocket.OPEN = 1;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (global as any).WebSocket.CONNECTING = 0;
  (useLocationStore as unknown as jest.Mock).mockImplementation((selector) =>
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

test('should send log when WebSocket is open', async () => {
  const { result } = renderHook(() => useTelemetrySender(), { wrapper });

  act(() => {
    result.current.sendLog('Test log', 'info');
  });

  await waitFor(() => {
    expect(mockWebSocketSend).toHaveBeenCalled();
    const message = JSON.parse(mockWebSocketSend.mock.calls[0][0]);
    expect(message.type).toBe('log');
    expect(message.log.message).toBe('Test log');
  });
});

test('should throttle log sending within 1s', async () => {
  const { result } = renderHook(() => useTelemetrySender(), { wrapper });

  act(() => {
    result.current.sendLog('First');
    result.current.sendLog('Second');
  });

  await waitFor(() => {
    expect(mockWebSocketSend).toHaveBeenCalledTimes(1);
  });
});

test('should not send telemetry if coordinates are null', () => {
  (useLocationStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({
      coords: { latitude: null, longitude: null, accuracy: null, speed: null },
    })
  );
  const { result } = renderHook(() => useTelemetrySender(), { wrapper });
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  expect(mockWebSocketSend).not.toHaveBeenCalled();
});

test('should enqueue message if WebSocket is not open', async () => {
  mockWebSocket.readyState = WebSocket.CONNECTING;
  const { result } = renderHook(() => useTelemetrySender(), { wrapper });
  act(() => {
    result.current.sendLog('Queued message');
  });
  expect(mockWebSocketSend).not.toHaveBeenCalled();

  // WebSocketが開通した時にキューからメッセージが送信されることを検証
  act(() => {
    mockWebSocket.readyState = WebSocket.OPEN;
    // onopen イベントをトリガー
    mockWebSocket.onopen?.();
  });

  await waitFor(() => {
    expect(mockWebSocketSend).toHaveBeenCalled();
    const message = JSON.parse(mockWebSocketSend.mock.calls[0][0]);
    expect(message.log.message).toBe('Queued message');
  });
});

test('should not connect with invalid WebSocket URL', () => {
  const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  renderHook(() => useTelemetrySender(false, 'invalid-url'), { wrapper });
  expect(spy).toHaveBeenCalledWith('Invalid WebSocket URL');
  spy.mockRestore();
});
