/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Provider, useAtomValue } from 'jotai';
import { useCurrentLine } from '~/hooks/useCurrentLine';
import { useCurrentStation } from '~/hooks/useCurrentStation';
import { useIsPassing } from '~/hooks/useIsPassing';
import { useTelemetryEnabled } from '~/hooks/useTelemetryEnabled';
import { useTelemetrySender } from '~/hooks/useTelemetrySender';
import stationState from '~/store/atoms/station';

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

// app_launch の自動送信と手動送信イベントが混ざるため、eventName で見分ける
const findInteractionCall = (eventName: string) =>
  mockFetch.mock.calls.find((call: any[]) => {
    if (call[0] !== 'https://example.com/graphql') {
      return false;
    }
    const body = JSON.parse(call[1].body);
    return (
      body.query.includes('sendInteractionEvent') &&
      body.variables.input.eventName === eventName
    );
  });

describe('useTelemetrySender (interaction events)', () => {
  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () =>
        Promise.resolve({
          data: { sendInteractionEvent: { sessionId: 'test-session-id' } },
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should send interaction event via GraphQL sendInteractionEvent mutation', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendInteractionEvent('tab_change', {
        tabName: 'settings',
        index: 2,
        fromUser: true,
      });
      await Promise.resolve();
    });

    await waitFor(
      () => {
        const call = findInteractionCall('tab_change');
        expect(call).toBeDefined();
        const input = JSON.parse(call[1].body).variables.input;
        expect(input.sessionId).toBe('test-session-id');
        expect(input.device).toBe('MockDevice');
        expect(input.appVersion).toBe('1.0.0(42)');
        expect(input.platform).toBe('ios');
        expect(input.channel).toBe('production');
        expect(typeof input.timestamp).toBe('number');
        expect(input.properties).toEqual({
          tabName: 'settings',
          index: 2,
          fromUser: true,
        });
      },
      { timeout: 2000 }
    );
  });

  test('should send null properties when omitted', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendInteractionEvent('screen_view');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        const call = findInteractionCall('screen_view');
        expect(call).toBeDefined();
        expect(JSON.parse(call[1].body).variables.input.properties).toBeNull();
      },
      { timeout: 2000 }
    );
  });

  test('should include Authorization header with token', async () => {
    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendInteractionEvent('tab_change');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        const call = findInteractionCall('tab_change');
        expect(call).toBeDefined();
        expect(call[1].headers.Authorization).toBe('Bearer test-token');
        expect(call[1].headers['Content-Type']).toBe('application/json');
      },
      { timeout: 2000 }
    );
  });

  test('should not send interaction event if telemetry is disabled', async () => {
    (useTelemetryEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendInteractionEvent('tab_change');
      await Promise.resolve();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should not send interaction event if baseUrl is not provided', async () => {
    const { result } = renderHook(() => useTelemetrySender(false, ''), {
      wrapper,
    });

    await act(async () => {
      result.current.sendInteractionEvent('tab_change');
      await Promise.resolve();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should warn when API returns error', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch.mockResolvedValue({
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
      result.current.sendInteractionEvent('tab_change');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Interaction event API error:',
          'Server error'
        );
      },
      { timeout: 2000 }
    );

    consoleSpy.mockRestore();
  });

  test('should handle fetch error gracefully', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await act(async () => {
      result.current.sendInteractionEvent('tab_change');
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to send interaction event:',
          expect.any(Error)
        );
      },
      { timeout: 2000 }
    );

    consoleSpy.mockRestore();
  });
});
