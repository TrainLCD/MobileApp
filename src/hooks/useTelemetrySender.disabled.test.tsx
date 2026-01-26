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
  let mockFetch: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockFetch = jest.fn();

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    global.fetch = mockFetch;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('does not send HTTP request when telemetry is disabled', async () => {
    renderHook(() => useTelemetrySender(true, 'https://localhost:8080'));

    await new Promise((r) => setTimeout(r, 30));

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
