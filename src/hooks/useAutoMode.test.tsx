import { render } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { createLine, createStation } from '~/utils/test/factories';
import { useAutoMode } from './useAutoMode';
import { useLoopLine } from './useLoopLine';

// Mock values that can be changed per test
let mockStationState = {
  station: null as Station | null,
  stations: [] as Station[],
  selectedDirection: null as 'INBOUND' | 'OUTBOUND' | null,
};

let mockLineState = {
  selectedLine: null as Line | null,
};

let mockNavigationState = {
  enableLegacyAutoMode: false,
  autoModeEnabled: false,
};

// Mock atom modules with identifiable references
jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  default: 'STATION_ATOM',
}));

jest.mock('../store/atoms/line', () => ({
  __esModule: true,
  default: 'LINE_ATOM',
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: 'NAVIGATION_ATOM',
}));

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('expo-location', () => ({
  __esModule: true,
  hasStartedLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

jest.mock('~/store/atoms/location', () => ({
  __esModule: true,
  setLocation: jest.fn(),
}));

jest.mock('./useLoopLine', () => ({
  __esModule: true,
  useLoopLine: jest.fn(),
}));

jest.mock('./useValueRef', () => ({
  __esModule: true,
  useValueRef: jest.fn((value) => ({ current: value })),
}));

const TestComponent: React.FC = () => {
  useAutoMode();
  return <Text testID="autoMode">AutoMode</Text>;
};

describe('useAutoMode', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseLoopLine = useLoopLine as jest.MockedFunction<
    typeof useLoopLine
  >;
  const mockHasStartedLocationUpdatesAsync =
    Location.hasStartedLocationUpdatesAsync as jest.MockedFunction<
      typeof Location.hasStartedLocationUpdatesAsync
    >;

  const stations = [
    createStation(1, { latitude: 35.681, longitude: 139.767 }),
    createStation(2, { latitude: 35.682, longitude: 139.768 }),
    createStation(3, { latitude: 35.683, longitude: 139.769 }),
  ];

  beforeEach(() => {
    jest.useFakeTimers();

    // Reset mock states
    mockStationState = {
      station: stations[0],
      stations,
      selectedDirection: 'INBOUND',
    };
    mockLineState = {
      selectedLine: createLine(1),
    };
    mockNavigationState = {
      enableLegacyAutoMode: false,
      autoModeEnabled: false,
    };

    // Setup useAtomValue mock to return values based on atom reference
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      switch (atom) {
        case 'STATION_ATOM':
          return mockStationState;
        case 'LINE_ATOM':
          return mockLineState;
        case 'NAVIGATION_ATOM':
          return mockNavigationState;
        default:
          throw new Error(`Unknown atom: ${String(atom)}`);
      }
    });

    mockUseLoopLine.mockReturnValue({
      isLoopLine: false,
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });

    mockHasStartedLocationUpdatesAsync.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('enableLegacyAutoMode=false の場合、位置更新を停止しない', () => {
    mockNavigationState = {
      enableLegacyAutoMode: false,
      autoModeEnabled: true,
    };

    render(<TestComponent />);

    expect(mockHasStartedLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('autoModeEnabled=false の場合、位置更新を停止しない', () => {
    mockNavigationState = {
      enableLegacyAutoMode: true,
      autoModeEnabled: false,
    };

    render(<TestComponent />);

    expect(mockHasStartedLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('enabled=true の場合、位置更新タスクの確認が実行される', async () => {
    mockHasStartedLocationUpdatesAsync.mockResolvedValue(true);
    mockNavigationState = {
      enableLegacyAutoMode: true,
      autoModeEnabled: true,
    };

    render(<TestComponent />);

    // 次のティックで非同期処理を実行
    await Promise.resolve();

    expect(mockHasStartedLocationUpdatesAsync).toHaveBeenCalled();
  });

  it('selectedDirection が null の場合でもレンダリングされる', () => {
    mockStationState = {
      station: stations[0],
      stations,
      selectedDirection: null,
    };
    mockNavigationState = {
      enableLegacyAutoMode: true,
      autoModeEnabled: true,
    };

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('autoMode')).toBeTruthy();
  });

  it('selectedLine が null の場合でもレンダリングされる', () => {
    mockLineState = {
      selectedLine: null,
    };
    mockNavigationState = {
      enableLegacyAutoMode: true,
      autoModeEnabled: true,
    };

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('autoMode')).toBeTruthy();
  });

  it('stations が空の場合でもエラーにならない', () => {
    mockStationState = {
      station: null,
      stations: [],
      selectedDirection: 'INBOUND',
    };
    mockNavigationState = {
      enableLegacyAutoMode: true,
      autoModeEnabled: true,
    };

    expect(() => render(<TestComponent />)).not.toThrow();
  });

  it('環状線の場合でもエラーにならない', () => {
    mockUseLoopLine.mockReturnValue({
      isLoopLine: true,
      isYamanoteLine: true,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    mockNavigationState = {
      enableLegacyAutoMode: true,
      autoModeEnabled: true,
    };

    expect(() => render(<TestComponent />)).not.toThrow();
  });

  it('OUTBOUND方向でもエラーにならない', () => {
    mockStationState = {
      station: stations[2],
      stations,
      selectedDirection: 'OUTBOUND',
    };
    mockNavigationState = {
      enableLegacyAutoMode: true,
      autoModeEnabled: true,
    };

    expect(() => render(<TestComponent />)).not.toThrow();
  });

  it('station が null でも正常にレンダリングされる', () => {
    mockStationState = {
      station: null,
      stations,
      selectedDirection: 'INBOUND',
    };

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('autoMode')).toBeTruthy();
  });
});
