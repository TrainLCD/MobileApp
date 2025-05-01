import { renderHook } from '@testing-library/react-native';
import { useTelemetrySender } from '../../src/hooks/useTelemetrySender';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
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
    selector({ coords: { latitude: 10, longitude: 20, accuracy: 5, speed: 15 } })
  ),
}));

jest.mock('react-native-dotenv', () => ({
  ENABLE_EXPERIMENTAL_TELEMETRY: 'true',
}));

global.WebSocket = jest.fn(() => ({
  readyState: WebSocket.OPEN,
  send: jest.fn(),
  close: jest.fn(),
  onopen: jest.fn(),
  onerror: jest.fn(),
  onclose: jest.fn(),
})) as any;

describe('useTelemetrySender', () => {
  it('sends telemetry payload via WebSocket when conditions are met', async () => {
    renderHook(() => useTelemetrySender());
    await new Promise((res) => setTimeout(res, 10));

    const instance = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;
    expect(instance.send).toHaveBeenCalledTimes(1);

    const data = JSON.parse(instance.send.mock.calls[0][0]);
    expect(data).toMatchObject({
      type: 'location_update',
      coords: {
        latitude: 10,
        longitude: 20,
        accuracy: 5,
        speed: 15,
      },
      accel: { x: 1, y: 2, z: 3 },
    });
  });
});
