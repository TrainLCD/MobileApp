import { render } from '@testing-library/react-native';
import * as Application from 'expo-application';
import { useAtomValue } from 'jotai';
import type { Station } from '~/@types/graphql';
import {
  accuracyHistoryAtom,
  backgroundLocationTrackingAtom,
  locationAtom,
} from '~/store/atoms/location';
import DevOverlay from './DevOverlay';

jest.mock('jotai', () => {
  const actual = jest.requireActual('jotai');
  return {
    ...actual,
    useAtomValue: jest.fn(),
  };
});

// Mock expo-application
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '100',
}));

// Mock hooks
jest.mock('~/hooks', () => ({
  useDistanceToNextStation: jest.fn(),
  useNextStation: jest.fn(),
}));

// Mock utils
jest.mock('~/utils/accuracyChart', () => ({
  generateAccuracyChart: jest.fn((history: number[] | null | undefined) => {
    // Mock implementation that returns AccuracyBlock[] format
    if (!history || history.length === 0) {
      return [];
    }
    return history.map((_accuracy) => ({
      char: '▇',
      color: '#ffffff',
    }));
  }),
}));

jest.mock('~/utils/telemetryConfig', () => ({
  isTelemetryEnabledByBuild: true,
}));

jest.mock('~/hooks/useTelemetryEnabled', () => ({
  useTelemetryEnabled: jest.fn(() => true),
}));

// Import mocked hooks for type safety
import { useDistanceToNextStation, useNextStation } from '~/hooks';

const mockUseAtomValue = useAtomValue as jest.MockedFunction<
  typeof useAtomValue
>;

const mockUseDistanceToNextStation =
  useDistanceToNextStation as jest.MockedFunction<
    typeof useDistanceToNextStation
  >;
const mockUseNextStation = useNextStation as jest.MockedFunction<
  typeof useNextStation
>;

describe('DevOverlay', () => {
  const setupAtomValues = ({
    location = {
      coords: {
        speed: 10,
        accuracy: 15,
      },
    },
    accuracyHistory = [10, 15, 20],
    backgroundLocationTracking = false,
  }: {
    location?: unknown;
    accuracyHistory?: unknown;
    backgroundLocationTracking?: boolean;
  } = {}) => {
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === locationAtom) {
        return location as never;
      }
      if (atom === accuracyHistoryAtom) {
        return accuracyHistory as never;
      }
      if (atom === backgroundLocationTrackingAtom) {
        return backgroundLocationTracking as never;
      }
      return undefined as never;
    });
  };

  beforeEach(() => {
    setupAtomValues();
    mockUseDistanceToNextStation.mockReturnValue('500');
    mockUseNextStation.mockReturnValue({
      id: 1,
      name: 'テスト駅',
      nameRoman: 'Test Station',
      stationNumbers: [{ stationNumber: 'JK-01' }],
    } as Station);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基本的なレンダリング', () => {
    it('クラッシュせずにレンダリングできる', () => {
      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('アプリケーションバージョンを表示する', () => {
      const { getByText } = render(<DevOverlay />);
      expect(
        getByText(
          `TrainLCD DO ${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`
        )
      ).toBeTruthy();
    });

    it('テレメトリー状態を表示する', () => {
      const { getByText } = render(<DevOverlay />);
      expect(getByText('TELEMETRY')).toBeTruthy();
      expect(getByText('ON')).toBeTruthy();
    });

    it('バックグラウンド位置情報のOFF状態を表示する', () => {
      const { getByText } = render(<DevOverlay />);
      expect(getByText('BG LOC')).toBeTruthy();
      expect(getByText('OFF')).toBeTruthy();
    });

    it('バックグラウンド位置情報のON状態を表示する', () => {
      setupAtomValues({
        location: {
          coords: { speed: 10, accuracy: 15 },
        },
        accuracyHistory: [10, 15, 20],
        backgroundLocationTracking: true,
      });

      const { getByText, getAllByText } = render(<DevOverlay />);
      expect(getByText('BG LOC')).toBeTruthy();
      expect(getAllByText('ON')).toHaveLength(2);
    });
  });

  describe('位置情報の表示', () => {
    it('精度情報を表示する', () => {
      const { getByText, getByTestId } = render(<DevOverlay />);
      expect(getByText('LOCATION ACCURACY')).toBeTruthy();
      expect(getByTestId('dev-overlay-accuracy-value')).toHaveTextContent(
        '15m'
      );
    });

    it('速度情報をkm/hで表示する', () => {
      const { getByText, getByTestId } = render(<DevOverlay />);
      expect(getByText('CURRENT SPEED')).toBeTruthy();
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
        '36km/h'
      );
    });

    it('次の駅までの距離を表示する', () => {
      const { getByText, getByTestId } = render(<DevOverlay />);
      expect(getByText('NEXT TARGET')).toBeTruthy();
      expect(getByTestId('dev-overlay-next-value')).toHaveTextContent('500m');
      expect(getByTestId('dev-overlay-next-meta')).toHaveTextContent(
        'テスト駅 / JK-01'
      );
    });

    it('精度チャートを表示する', () => {
      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-accuracy-history')).toHaveTextContent(
        '▇▇▇'
      );
    });
  });

  describe('エッジケース', () => {
    it('位置情報がnullの場合にクラッシュしない', () => {
      setupAtomValues({
        location: null,
        accuracyHistory: [],
        backgroundLocationTracking: false,
      });

      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('速度がnullの場合に0km/hを表示する', () => {
      setupAtomValues({
        location: {
          coords: { speed: null, accuracy: 15 },
        },
        accuracyHistory: [],
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent('0km/h');
    });

    it('速度が負の値の場合に0km/hを表示する', () => {
      setupAtomValues({
        location: {
          coords: { speed: -5, accuracy: 15 },
        },
        accuracyHistory: [],
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent('0km/h');
    });

    it('精度がnullの場合に空文字を表示する', () => {
      setupAtomValues({
        location: {
          coords: { speed: 10, accuracy: null },
        },
        accuracyHistory: [],
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-accuracy-value')).toHaveTextContent('--');
    });

    it('accuracyHistoryが空配列の場合にクラッシュしない', () => {
      setupAtomValues({
        location: {
          coords: { speed: 10, accuracy: 15 },
        },
        accuracyHistory: [],
        backgroundLocationTracking: false,
      });

      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('accuracyHistoryがnullの場合にクラッシュしない', () => {
      setupAtomValues({
        location: {
          coords: { speed: 10, accuracy: 15 },
        },
        accuracyHistory: null,
        backgroundLocationTracking: false,
      });

      expect(() => {
        render(<DevOverlay />);
      }).not.toThrow();
    });

    it('次の駅までの距離が0の場合に適切に表示する', () => {
      mockUseDistanceToNextStation.mockReturnValue(0);

      const { getByText, getByTestId } = render(<DevOverlay />);
      expect(getByText('NEXT TARGET')).toBeTruthy();
      expect(getByTestId('dev-overlay-next-value')).toHaveTextContent('--');
    });

    it('次の駅情報がundefinedの場合に距離のみ表示する', () => {
      mockUseNextStation.mockReturnValue(undefined);

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-next-value')).toHaveTextContent('500m');
    });

    it('次の駅情報と距離の両方がundefined/0の場合', () => {
      mockUseDistanceToNextStation.mockReturnValue(0);
      mockUseNextStation.mockReturnValue(undefined);

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-next-value')).toHaveTextContent('--');
    });
  });

  describe('速度計算のロジック', () => {
    it('速度が0の場合に0km/hを表示する', () => {
      setupAtomValues({
        location: {
          coords: { speed: 0, accuracy: 15 },
        },
        accuracyHistory: [],
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent('0km/h');
    });

    it('速度が正の小数値の場合に正しく変換する', () => {
      setupAtomValues({
        location: {
          coords: { speed: 13.89, accuracy: 15 },
        },
        accuracyHistory: [],
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
        '50km/h'
      );
    });
  });
});
