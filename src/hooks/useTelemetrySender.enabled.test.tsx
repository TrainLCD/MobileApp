/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Provider, useAtomValue } from 'jotai';
import { useCurrentLine } from '~/hooks/useCurrentLine';
import { useCurrentStation } from '~/hooks/useCurrentStation';
import { useIsPassing } from '~/hooks/useIsPassing';
import { useTelemetryEnabled } from '~/hooks/useTelemetryEnabled';
import { useTelemetrySender } from '~/hooks/useTelemetrySender';
import stationState from '~/store/atoms/station';

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
  EXPERIMENTAL_TELEMETRY_ENDPOINT_URL: 'https://example.com',
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
  TELEMETRY_MAX_QUEUE_SIZE: 1000,
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

let mockFetch: jest.Mock;

describe('useTelemetrySender', () => {
  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    });
    global.fetch = mockFetch;

    (useAtomValue as jest.Mock).mockReturnValue({
      coords: {
        latitude: 35.0,
        longitude: 139.0,
        accuracy: 5,
        speed: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
      },
      timestamp: Date.now(),
    });

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

  test('should send log via fetch API', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Test log from the app', 'info');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
        const calls = mockFetch.mock.calls;
        const logCall = calls.find((call: any[]) => {
          return call[0] === 'https://example.com/api/log';
        });
        expect(logCall).toBeDefined();
        const body = JSON.parse(logCall[1].body);
        expect(body.log.message).toBe('Test log from the app');
        expect(body.log.level).toBe('info');
        expect(body.log.type).toBe('app');
        expect(body.device).toBe('MockDevice');
      },
      { timeout: 2000 }
    );
  });

  test('should send log with default level as debug', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Debug message');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
        const calls = mockFetch.mock.calls;
        const logCall = calls.find((call: any[]) => {
          return call[0] === 'https://example.com/api/log';
        });
        expect(logCall).toBeDefined();
        const body = JSON.parse(logCall[1].body);
        expect(body.log.level).toBe('debug');
      },
      { timeout: 2000 }
    );
  });

  test('should not send log if telemetry is disabled', async () => {
    (useTelemetryEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Test log');
      await Promise.resolve();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should not send log if baseUrl is not provided', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, ''),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Test log');
      await Promise.resolve();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should include Authorization header with token', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Test log', 'info');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
        const calls = mockFetch.mock.calls;
        const logCall = calls.find((call: any[]) => {
          return call[0] === 'https://example.com/api/log';
        });
        expect(logCall).toBeDefined();
        expect(logCall[1].headers.Authorization).toMatch(/^Bearer .+$/);
        expect(logCall[1].headers['Content-Type']).toBe('application/json');
      },
      { timeout: 2000 }
    );
  });

  test('should handle fetch error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Test log', 'info');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to send log:',
          expect.any(Error)
        );
      },
      { timeout: 2000 }
    );

    consoleSpy.mockRestore();
  });

  test('should warn when API returns error', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ ok: false, error: 'Server error' }),
    });

    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Test log', 'info');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalledWith('Log API error:', 'Server error');
      },
      { timeout: 2000 }
    );

    consoleSpy.mockRestore();
  });

  test('should send multiple logs independently', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('First');
      result.current.sendLog('Second');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        const logCalls = mockFetch.mock.calls.filter(
          (call: any[]) => call[0] === 'https://example.com/api/log'
        );
        expect(logCalls.length).toBe(2);
      },
      { timeout: 2000 }
    );
  });
});
