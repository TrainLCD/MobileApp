/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { renderHook, waitFor } from '@testing-library/react-native';
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

const findAppLaunchCalls = () =>
  mockFetch.mock.calls.filter((call: any[]) => {
    if (call[0] !== 'https://example.com/graphql') {
      return false;
    }
    const body = JSON.parse(call[1].body);
    return (
      body.query.includes('sendInteractionEvent') &&
      body.variables.input.eventName === 'app_launch'
    );
  });

// NOTE: app_launchの一度きり送信はモジュールレベルのフラグで管理されるため、
// このdescribe内のテストは記述順に依存する(disabled → 初回送信 → 再送なし)
describe('useTelemetrySender (app_launch event)', () => {
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
      coords: null,
      timestamp: Date.now(),
    });

    (useCurrentLine as jest.Mock).mockReturnValue(null);
    (useCurrentStation as jest.Mock).mockReturnValue(null);
    (useIsPassing as jest.Mock).mockReturnValue(false);
    (useTelemetryEnabled as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should not send app_launch while telemetry is disabled', async () => {
    (useTelemetryEnabled as jest.Mock).mockReturnValue(false);

    renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await new Promise((r) => setTimeout(r, 30));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('should send app_launch once when telemetry becomes enabled', async () => {
    renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await waitFor(
      () => {
        const calls = findAppLaunchCalls();
        expect(calls.length).toBe(1);
        const input = JSON.parse(calls[0][1].body).variables.input;
        expect(input.sessionId).toBe('test-session-id');
        expect(input.device).toBe('MockDevice');
        expect(input.appVersion).toBe('1.0.0(42)');
        expect(input.platform).toBe('ios');
        expect(input.channel).toBe('production');
        expect(input.properties).toBeNull();
      },
      { timeout: 2000 }
    );
  });

  test('should not send app_launch again from other hook instances', async () => {
    renderHook(
      () => useTelemetrySender(false, 'https://example.com', 'test-token'),
      { wrapper }
    );
    renderHook(
      () => useTelemetrySender(true, 'https://example.com', 'test-token'),
      { wrapper }
    );

    await new Promise((r) => setTimeout(r, 30));

    expect(findAppLaunchCalls().length).toBe(0);
  });
});
