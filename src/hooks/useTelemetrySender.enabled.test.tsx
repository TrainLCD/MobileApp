/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Battery from 'expo-battery';
import { Provider, useAtomValue } from 'jotai';
import { useCurrentLine } from '~/hooks/useCurrentLine';
import { useCurrentStation } from '~/hooks/useCurrentStation';
import { useIsPassing } from '~/hooks/useIsPassing';
import { useTelemetryEnabled } from '~/hooks/useTelemetryEnabled';
import { useTelemetrySender } from '~/hooks/useTelemetrySender';
import stationState from '~/store/atoms/station';

const TELEMETRY_THROTTLE_MS = 1; // NOTE: flakyになるので実運用より短め

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '42',
}));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-session-id'),
}));
jest.mock('expo-device', () => ({ modelName: 'MockDevice' }));
jest.mock('~/utils/isDevApp', () => ({ isDevApp: false }));
jest.mock('expo-battery', () => ({
  BatteryState: {
    UNKNOWN: 0,
    UNPLUGGED: 1,
    CHARGING: 2,
    FULL: 3,
  },
  getBatteryLevelAsync: jest.fn(),
  getBatteryStateAsync: jest.fn(),
}));
jest.mock('expo-network', () => ({
  useNetworkState: jest.fn().mockReturnValue({ type: 'WIFI' }),
  NetworkStateType: { WIFI: 'WIFI' },
}));
jest.mock('~/utils/telemetryConfig', () => ({
  isTelemetryEnabledByBuild: true,
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
const mockGetBatteryLevelAsync = Battery.getBatteryLevelAsync as jest.Mock;
const mockGetBatteryStateAsync = Battery.getBatteryStateAsync as jest.Mock;

// ログも位置情報も同じ/graphqlに飛ぶため、mutation名でリクエストを見分ける
const findGraphQLCall = (mutationName: string) =>
  mockFetch.mock.calls.find((call: any[]) => {
    return (
      call[0] === 'https://example.com/graphql' &&
      JSON.parse(call[1].body).query.includes(mutationName)
    );
  });

describe('useTelemetrySender', () => {
  beforeEach(() => {
    // どのmutationに対しても有効なレスポンスを返す。app_launchの自動送信が
    // 失敗扱いになると送信済みフラグが戻り、後続テストのmockResolvedValueOnce等が
    // app_launch側に消費されてしまうため、成功レスポンスでフラグを確定させる
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () =>
        Promise.resolve({
          data: {
            sendLogEvent: { sessionId: 'test-session-id' },
            sendLocation: { sessionId: 'test-session-id', warning: null },
            sendInteractionEvent: { sessionId: 'test-session-id' },
          },
        }),
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
    mockGetBatteryLevelAsync.mockResolvedValue(0.5);
    mockGetBatteryStateAsync.mockResolvedValue(Battery.BatteryState.CHARGING);

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('should send log via GraphQL sendLogEvent mutation', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Test log from the app', 'info');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
        const logCall = findGraphQLCall('sendLogEvent');
        expect(logCall).toBeDefined();
        const input = JSON.parse(logCall[1].body).variables.input;
        expect(input.message).toBe('Test log from the app');
        expect(input.level).toBe('info');
        expect(input.type).toBe('app');
        expect(input.device).toBe('MockDevice');
        expect(input.sessionId).toBe('test-session-id');
        expect(input.appVersion).toBe('1.0.0(42)');
        expect(input.platform).toBe('ios');
        expect(input.channel).toBe('production');
      },
      { timeout: 2000 }
    );
  });

  test('should send log with default level as debug', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Debug message');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
        const logCall = findGraphQLCall('sendLogEvent');
        expect(logCall).toBeDefined();
        const body = JSON.parse(logCall[1].body);
        expect(body.variables.input.level).toBe('debug');
      },
      { timeout: 2000 }
    );
  });

  test('should redact sensitive token-like values in telemetry payload', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('token=abc123-secret-value', 'error');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
        const logCall = findGraphQLCall('sendLogEvent');
        expect(logCall).toBeDefined();
        const message = JSON.parse(logCall[1].body).variables.input.message;
        expect(message).toContain('token=[REDACTED]');
        expect(message).not.toContain('abc123-secret-value');
      },
      { timeout: 2000 }
    );
  });

  test('should not send log if telemetry is disabled', async () => {
    (useTelemetryEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Test log');
      await Promise.resolve();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should not send log if baseUrl is not provided', async () => {
    const { result } = renderHook(() => useTelemetrySender(false, ''), {
      wrapper,
    });

    await act(async () => {
      result.current.sendLog('Test log');
      await Promise.resolve();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should include Authorization header with token', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Test log', 'info');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
        const logCall = findGraphQLCall('sendLogEvent');
        expect(logCall).toBeDefined();
        expect(logCall[1].headers.Authorization).toMatch(/^Bearer .+$/);
        expect(logCall[1].headers['Content-Type']).toBe('application/json');
      },
      { timeout: 2000 }
    );
  });

  test('should handle fetch error gracefully', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
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
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () =>
        Promise.resolve({ data: null, errors: [{ message: 'Server error' }] }),
    });

    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendLog('Test log', 'info');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Log API error:',
          'Server error'
        );
      },
      { timeout: 2000 }
    );

    consoleSpy.mockRestore();
  });

  test('should send multiple logs independently', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
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
          (call: any[]) =>
            call[0] === 'https://example.com/graphql' &&
            JSON.parse(call[1].body).query.includes('sendLogEvent')
        );
        expect(logCalls.length).toBe(2);
      },
      { timeout: 2000 }
    );
  });

  test('should send location via GraphQL sendLocation mutation', async () => {
    renderHook(
      () => useTelemetrySender(true, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await waitFor(
      () => {
        const locationCall = findGraphQLCall('sendLocation');
        expect(locationCall).toBeDefined();
        const body = JSON.parse(locationCall[1].body);
        const input = body.variables.input;
        expect(input.sessionId).toBe('test-session-id');
        expect(input.device).toBe('MockDevice');
        // useAtomValueのモックが全atomに同じtruthyな値を返すためarrivedになる
        expect(input.state).toBe('arrived');
        expect(input.lineId).toBe(11302);
        expect(input.stationId).toBe(1130224);
        // expo-locationのm/sからkm/hに変換される
        expect(input.coords.speed).toBeCloseTo(36);
        expect(input.batteryState).toBe('charging');
      },
      { timeout: 2000 }
    );
  });

  test('should send location payload with null battery level when battery API returns -1', async () => {
    mockGetBatteryLevelAsync.mockResolvedValueOnce(-1);

    renderHook(
      () => useTelemetrySender(true, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await waitFor(
      () => {
        const locationCall = findGraphQLCall('sendLocation');
        expect(locationCall).toBeDefined();
        const body = JSON.parse(locationCall[1].body);
        expect(body.variables.input.batteryLevel).toBeNull();
      },
      { timeout: 2000 }
    );
  });

  test('should warn when GraphQL API returns errors', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () =>
        Promise.resolve({
          data: null,
          errors: [{ message: 'unauthorized' }],
        }),
    });

    renderHook(
      () => useTelemetrySender(true, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Location API error:',
          'unauthorized'
        );
      },
      { timeout: 2000 }
    );

    consoleSpy.mockRestore();
  });
});
