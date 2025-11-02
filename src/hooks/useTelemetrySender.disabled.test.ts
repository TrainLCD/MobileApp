/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { renderHook } from '@testing-library/react-native';
import { useTelemetrySender } from '~/hooks/useTelemetrySender';

jest.mock('~/utils/telemetryConfig', () => ({
  isTelemetryEnabled: false,
}));

jest.mock('expo-device', () => ({
  modelName: 'TestDevice',
}));

jest.mock('jotai', () => ({
  atom: jest.fn(),
  useAtomValue: jest.fn(() => ({
    arrived: false,
    approaching: true,
  })),
}));

jest.mock('~/hooks/useIsPassing', () => ({
  useIsPassing: jest.fn(() => false),
}));

jest.mock('~/hooks/useLocationStore', () => ({
  useLocationStore: jest
    .fn()
    .mockImplementation((selector: (state: any) => any) =>
      selector({
        location: {
          coords: {
            latitude: 35,
            longitude: 139,
            accuracy: 5,
            speed: 10,
          },
        },
        accuracyHistory: [5],
      })
    ),
}));

describe('useTelemetrySender (ENABLE_EXPERIMENTAL_TELEMETRY=false)', () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();

    global.WebSocket = jest.fn().mockImplementation(() => ({
      readyState: 1,
      send: mockSend,
      close: jest.fn(),
    })) as any;

    (global.WebSocket as any).OPEN = 1;
  });

  it('does not open websocket or send data', async () => {
    renderHook(() => useTelemetrySender(true, 'wss://localhost:8080'));

    await new Promise((r) => setTimeout(r, 30));

    expect(global.WebSocket).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
