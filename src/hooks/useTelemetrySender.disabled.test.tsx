/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { renderHook } from '@testing-library/react-native';
import { useTelemetrySender } from '~/hooks/useTelemetrySender';

jest.mock('~/utils/telemetryConfig', () => ({
  isTelemetryEnabledByBuild: false,
}));

jest.mock('expo-device', () => ({
  modelName: 'TestDevice',
}));

jest.mock('jotai', () => ({
  atom: jest.fn(),
  useAtomValue: jest.fn(() => ({
    arrived: false,
    approaching: true,
    telemetryEnabled: false,
  })),
}));

jest.mock('~/hooks/useIsPassing', () => ({
  useIsPassing: jest.fn(() => false),
}));

jest.mock('~/hooks/useCurrentStation', () => ({
  useCurrentStation: jest.fn(() => null),
}));

jest.mock('~/hooks/useCurrentLine', () => ({
  useCurrentLine: jest.fn(() => ({ id: 1 })),
}));

jest.mock('~/store/atoms/location', () => ({
  locationAtom: null,
  accuracyHistoryAtom: [],
}));

describe('useTelemetrySender (ENABLE_EXPERIMENTAL_TELEMETRY=false)', () => {
  let mockSend: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSend = jest.fn();

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    global.WebSocket = jest.fn().mockImplementation(() => ({
      readyState: 1,
      send: mockSend,
      close: jest.fn(),
    })) as any;

    (global.WebSocket as any).OPEN = 1;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('does not open websocket or send data', async () => {
    renderHook(() => useTelemetrySender(true, 'wss://localhost:8080'));

    await new Promise((r) => setTimeout(r, 30));

    expect(global.WebSocket).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
