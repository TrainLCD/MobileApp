import { Provider, useAtomValue } from 'jotai';
import { useCurrentLine } from '~/hooks/useCurrentLine';
import { useCurrentStation } from '~/hooks/useCurrentStation';
import { useIsPassing } from '~/hooks/useIsPassing';
import { useTelemetryEnabled } from '~/hooks/useTelemetryEnabled';
import stationState from '~/store/atoms/station';

// useTelemetrySenderのテスト用共通セットアップ。
// jest.mockはbabel-preset-jestによりこのモジュールの先頭へホイストされるため、
// テストファイルが本モジュールをimportした時点で依存モジュールのモックが登録される。
// テスト対象(useTelemetrySender)やモック済みフックは順序事故を防ぐため
// 必ず本モジュールのre-export経由でimportすること。
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

export { useTelemetrySender } from '~/hooks/useTelemetrySender';
export { useTelemetryEnabled };

export const TELEMETRY_TEST_BASE_URL = 'https://example.com';

export const TelemetryTestWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => (
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

// beforeEachから呼び、モックの既定値とfetchモックをまとめて設定する
export const setupTelemetrySenderMocks = (): jest.Mock => {
  const mockFetch = jest.fn().mockResolvedValue({
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

  return mockFetch;
};

// app_launchの自動送信と手動送信イベントが混ざるため、eventNameで見分ける
export const findInteractionEventCalls = (
  mockFetch: jest.Mock,
  eventName: string
) =>
  mockFetch.mock.calls.filter((call) => {
    if (call[0] !== `${TELEMETRY_TEST_BASE_URL}/graphql`) {
      return false;
    }
    const body = JSON.parse(call[1].body);
    return (
      body.query.includes('sendInteractionEvent') &&
      body.variables.input.eventName === eventName
    );
  });
