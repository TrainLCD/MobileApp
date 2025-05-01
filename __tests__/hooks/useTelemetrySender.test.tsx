import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTelemetrySender } from '../../src/hooks/useTelemetrySender';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
}));

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    addListener: jest.fn((cb) => {
      setTimeout(() => cb({ x: 1, y: 2, z: 3 }), 0);
      return { remove: jest.fn() };
    }),
  },
}));

jest.mock('../../src/hooks/useLocationStore', () => ({
  useLocationStore: jest.fn((selector) =>
    selector({
      coords: {
        latitude: 10,
        longitude: 20,
        accuracy: 5,
        speed: 15,
      },
    })
  ),
}));

jest.mock('react-native-dotenv', () => ({
  ENABLE_EXPERIMENTAL_TELEMETRY: 'true',
}));

// __DEV__ を true に上書き
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
(global as any).__DEV__ = true;

// WebSocket モック
const mockWebSocketInstance = {
  readyState: 1, // WebSocket.OPEN
  send: jest.fn(),
  close: jest.fn(),
  onopen: null,
  onerror: null,
  onclose: null,
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
(global as any).WebSocket = jest.fn(() => mockWebSocketInstance);

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
(global as any).WebSocket.OPEN = 1;

describe('useTelemetrySender', () => {
  it('sends telemetry when all conditions are met', async () => {
    renderHook(() => useTelemetrySender());

    await act(async () => {
      await new Promise((res) => setTimeout(res, 50));
    });

    await waitFor(() => {
      const wsInstance = mockWebSocketInstance;

      expect(wsInstance.send).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(wsInstance.send.mock.calls[0][0]);
      expect(sent).toMatchObject({
        type: 'location_update',
        coords: {
          latitude: 10,
          longitude: 20,
          accuracy: 5,
          speed: 15,
        },
        accel: { x: 1, y: 2, z: 3 },
      });
      expect(sent.timestamp).toBeGreaterThan(0);
    });
  });
});
