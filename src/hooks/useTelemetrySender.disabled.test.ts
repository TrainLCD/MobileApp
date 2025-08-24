/** biome-ignore-all lint/suspicious/noExplicitAny: テストコードまで型安全にするのはつらい */
import { renderHook } from '@testing-library/react-native';
import { useTelemetrySender } from '~/hooks/useTelemetrySender';

jest.mock('~/utils/telemetryConfig', () => ({
  isTelemetryEnabled: false,
}));

jest.mock('expo-device', () => ({
  modelName: 'TestDevice',
}));

jest.mock('expo-network', () => ({
  NetworkStateType: {
    WIFI: 'WIFI',
    CELLULAR: 'CELLULAR',
    NONE: 'NONE',
  },
  useNetworkState: jest.fn(() => ({
    type: 'WIFI',
    isConnected: true,
    isInternetReachable: true,
  })),
}));

jest.mock('jotai', () => ({
  atom: jest.fn(),
  useAtomValue: jest.fn((atom) => {
    // stationState の場合は完全なステート構造を返す
    if (
      atom?.toString?.().includes('station') ||
      atom === require('~/store/atoms/station').default
    ) {
      return {
        arrived: false,
        approaching: true,
        station: null,
        stations: [],
        selectedDirection: null,
        selectedBound: null,
        wantedDestination: null,
      };
    }
    // その他の atom の場合はデフォルト値を返す
    return {
      arrived: false,
      approaching: true,
    };
  }),
}));

jest.mock('~/hooks/useIsPassing', () => ({
  useIsPassing: jest.fn(() => false),
}));

jest.mock('~/hooks/useCurrentStation', () => ({
  useCurrentStation: jest.fn(() => null),
}));

jest.mock('~/hooks/useNextStation', () => ({
  useNextStation: jest.fn(() => null),
}));

jest.mock('~/utils/native/android/gnssModule', () => ({
  subscribeGnss: jest.fn(() => () => {}),
}));

jest.mock('~/hooks/useLocationStore', () => ({
  useLocationStore: jest
    .fn()
    .mockImplementation((selector: (state: any) => any) =>
      selector({
        coords: {
          latitude: 35,
          longitude: 139,
          accuracy: 5,
          speed: 10,
        },
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
