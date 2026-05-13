import { act, render } from '@testing-library/react-native';
import * as Application from 'expo-application';
import { useAtomValue } from 'jotai';
import { Dimensions } from 'react-native';
import type { Station } from '~/@types/graphql';
import {
  backgroundLocationTrackingAtom,
  locationAtom,
} from '~/store/atoms/location';
import { isLEDThemeAtom } from '~/store/atoms/theme';
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
    // Mock implementation that mirrors generateAccuracyChart's invalid-value filter
    if (!history || history.length === 0) {
      return [];
    }
    return history
      .filter((value) => Number.isFinite(value) && value >= 0)
      .map(() => ({
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
  const mockDimensionsGet = jest.spyOn(Dimensions, 'get');

  const setupAtomValues = ({
    location = {
      coords: {
        speed: 10,
        accuracy: 15,
      },
    },
    backgroundLocationTracking = false,
  }: {
    location?: unknown;
    backgroundLocationTracking?: boolean;
  } = {}) => {
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === locationAtom) {
        return location as never;
      }
      if (atom === backgroundLocationTrackingAtom) {
        return backgroundLocationTracking as never;
      }
      if (atom === isLEDThemeAtom) {
        return false as never;
      }
      throw new Error(`Unexpected atom mock: ${String(atom)}`);
    });
  };

  beforeEach(() => {
    mockDimensionsGet.mockReturnValue({
      width: 393,
      height: 852,
      scale: 3,
      fontScale: 1,
    } as ReturnType<typeof Dimensions.get>);
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
    mockDimensionsGet.mockReset();
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
        backgroundLocationTracking: true,
      });

      const { getByText, getAllByText } = render(<DevOverlay />);
      expect(getByText('BG LOC')).toBeTruthy();
      expect(getAllByText('ON')).toHaveLength(2);
    });

    it('横画面レイアウトを表示する', () => {
      mockDimensionsGet.mockReturnValue({
        width: 852,
        height: 393,
        scale: 3,
        fontScale: 1,
      } as ReturnType<typeof Dimensions.get>);

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-landscape')).toBeTruthy();
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

    it('精度情報の小数点を切り捨てて表示する', () => {
      setupAtomValues({
        location: {
          coords: { speed: 10, accuracy: 15.9 },
        },
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
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

    it('精度チャートをマウント直後に1サンプル分描画する', () => {
      const { getByTestId } = render(<DevOverlay />);
      // マウント時の即時サンプリングで1件積まれる
      expect(getByTestId('dev-overlay-accuracy-history')).toHaveTextContent(
        /^▇$/
      );
    });

    it('精度チャートが1秒ごとに無条件で更新される', () => {
      jest.useFakeTimers();
      try {
        const { getByTestId } = render(<DevOverlay />);
        // 初回サンプル
        expect(getByTestId('dev-overlay-accuracy-history')).toHaveTextContent(
          /^▇$/
        );

        act(() => {
          jest.advanceTimersByTime(3000);
        });

        // 位置情報イベントが届かなくても interval 由来で履歴が積み増される
        expect(getByTestId('dev-overlay-accuracy-history')).toHaveTextContent(
          /^▇{4}$/
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('位置情報が取得できない状態で精度チャートが空のまま維持される', () => {
      setupAtomValues({
        location: null,
        backgroundLocationTracking: false,
      });
      jest.useFakeTimers();
      try {
        const { getByTestId } = render(<DevOverlay />);
        act(() => {
          jest.advanceTimersByTime(5000);
        });
        // NaN だけが積まれるため generateAccuracyChart 側で全件除外され '---' になる
        expect(getByTestId('dev-overlay-accuracy-history')).toHaveTextContent(
          '---'
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('エッジケース', () => {
    it('位置情報がnullの場合にクラッシュしない', () => {
      setupAtomValues({
        location: null,
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
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-accuracy-value')).toHaveTextContent('--');
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
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
        '50km/h'
      );
    });
  });
});
