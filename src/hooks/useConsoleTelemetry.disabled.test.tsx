import { renderHook } from '@testing-library/react-native';
import { useConsoleTelemetry } from '~/hooks/useConsoleTelemetry';

jest.mock('~/utils/telemetryConfig', () => ({
  isTelemetryEnabledByBuild: false,
}));

jest.mock('expo-device', () => ({
  modelName: 'TestDevice',
}));

jest.mock('jotai', () => ({
  atom: jest.fn(),
  useAtomValue: jest.fn(() => ({
    telemetryEnabled: false,
  })),
}));

describe('useConsoleTelemetry (ENABLE_EXPERIMENTAL_TELEMETRY=false)', () => {
  let mockFetch: jest.Mock;
  const savedLog = console.log;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    console.log = savedLog;
    jest.clearAllMocks();
  });

  it('does not patch console methods when telemetry is disabled', () => {
    const originalLog = console.log;

    renderHook(() =>
      useConsoleTelemetry('https://localhost:8080', 'test-token')
    );

    expect(console.log).toBe(originalLog);
  });

  it('does not send HTTP request when telemetry is disabled', async () => {
    renderHook(() => useConsoleTelemetry('https://localhost:8080'));

    console.log('should not be sent');

    await new Promise((r) => setTimeout(r, 30));

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
