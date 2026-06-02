import { act, render } from '@testing-library/react-native';
import * as Application from 'expo-application';
import { useAtomValue } from 'jotai';
import { Dimensions, StyleSheet } from 'react-native';
import type { Station } from '~/@types/graphql';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import {
  backgroundLocationTrackingAtom,
  locationAtom,
  rawLocationAtom,
} from '~/store/atoms/location';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import DevOverlay, { getDevOverlayDragTranslation } from './DevOverlay';

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
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 812, height: 375 })),
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
    // locationAtomはフィルタ・スムージング後の値で、速度や次駅距離の表示元
    location = {
      coords: {
        speed: 10,
        accuracy: 15,
      },
    },
    // rawLocationAtomは継続測位の生の値で、精度表示はlocationAtomではなくここから読む。
    // 既定は精度15mの測位が継続取得できている状態を表す（locationAtomとは独立した別物）。
    rawLocation = {
      coords: {
        accuracy: 15,
      },
    },
    backgroundLocationTracking = false,
  }: {
    location?: unknown;
    rawLocation?: unknown;
    backgroundLocationTracking?: boolean;
  } = {}) => {
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === locationAtom) {
        return location as never;
      }
      if (atom === rawLocationAtom) {
        return rawLocation as never;
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

  describe('D&D座標変換', () => {
    it('物理横向きではドラッグ量をright/top基準の移動量に変換する', () => {
      expect(getDevOverlayDragTranslation(24, 10, false)).toEqual({
        x: -24,
        y: 10,
      });
    });

    it('物理縦向きで90度回転表示している場合はドラッグ量をローカル座標へ変換する', () => {
      expect(getDevOverlayDragTranslation(24, 10, true)).toEqual({
        x: -10,
        y: -24,
      });
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
        rawLocation: {
          coords: { accuracy: 15.9 },
        },
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-accuracy-value')).toHaveTextContent(
        '15m'
      );
    });

    it('生の精度がMAX_PERMIT_ACCURACYを超える場合は赤字で表示する', () => {
      setupAtomValues({
        rawLocation: {
          coords: { speed: 10, accuracy: MAX_PERMIT_ACCURACY + 100 },
        },
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      const valueStyle = StyleSheet.flatten(
        getByTestId('dev-overlay-accuracy-value').props.style
      );
      expect(valueStyle.color).toBe('#f87171');
    });

    it('生の精度がMAX_PERMIT_ACCURACY以下の場合は赤字にしない', () => {
      setupAtomValues({
        rawLocation: {
          coords: { speed: 10, accuracy: MAX_PERMIT_ACCURACY },
        },
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      const valueStyle = StyleSheet.flatten(
        getByTestId('dev-overlay-accuracy-value').props.style
      );
      expect(valueStyle.color).not.toBe('#f87171');
    });

    it('継続測位の生の値（rawLocation）が無い場合は精度を表示しない', () => {
      // 継続測位（watch/background）はhandleTrackingLocation経由でrawLocationを記録する。
      // ワンショット取得や手動選択のみでrawLocationが無い状態では精度を出さない。
      setupAtomValues({
        location: {
          coords: { speed: 10, accuracy: 42 },
        },
        rawLocation: null,
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-accuracy-value')).toHaveTextContent('--');
    });

    it('startLocationUpdatesAsync経路でlocationAtomがフィルタ後の値でも生の精度を表示する', () => {
      // バックグラウンドタスクはMAX_PERMIT_ACCURACY超過を棄却するため、
      // locationAtomには直近のフィルタ通過値が残り、rawLocationAtomに生の値が入る
      setupAtomValues({
        location: {
          coords: { speed: 10, accuracy: 15 },
        },
        rawLocation: {
          coords: { speed: 10, accuracy: MAX_PERMIT_ACCURACY + 500 },
        },
        backgroundLocationTracking: true,
      });

      const { getByTestId } = render(<DevOverlay />);
      const valueNode = getByTestId('dev-overlay-accuracy-value');
      // フィルタ後の15mではなく生の精度を表示し、赤字で警告する
      expect(valueNode).toHaveTextContent(`${MAX_PERMIT_ACCURACY + 500}m`);
      expect(StyleSheet.flatten(valueNode.props.style).color).toBe('#f87171');
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
        rawLocation: null,
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
        rawLocation: {
          coords: { accuracy: null },
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
