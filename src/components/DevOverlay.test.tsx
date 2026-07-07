import { act, render } from '@testing-library/react-native';
import * as Application from 'expo-application';
import { useAtomValue } from 'jotai';
import { Dimensions, StyleSheet } from 'react-native';
import type { Station } from '~/@types/graphql';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import { BAD_ACCURACY_THRESHOLD } from '~/constants/threshold';
import * as remoteConfigModule from '~/lib/remoteConfig';
import { etaFallbackActiveAtom, etaPhaseAtom } from '~/store/atoms/etaFallback';
import {
  backgroundLocationTrackingAtom,
  locationAtom,
  rawLocationAtom,
} from '~/store/atoms/location';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
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
    // locationAtomはフィルタ・スムージング後の値。通常モードの速度・精度表示はここから読まないが、
    // オートモード中はuseSimulationModeがここへ書き込むため、参照元がこちらへ切り替わる
    location = {
      coords: {
        speed: 10,
        accuracy: 15,
      },
    },
    // rawLocationAtomは継続測位の生の値で、通常モードでは速度・精度ともにここから読む。
    // 既定は速度10m/s・精度15mの測位が継続取得できている状態を表す（locationAtomとは独立した別物）。
    rawLocation = {
      coords: {
        speed: 10,
        accuracy: 15,
      },
    },
    backgroundLocationTracking = false,
    autoModeEnabled = false,
    etaFallbackActive = false,
    etaPhase = null,
  }: {
    location?: unknown;
    rawLocation?: unknown;
    backgroundLocationTracking?: boolean;
    autoModeEnabled?: boolean;
    etaFallbackActive?: boolean;
    etaPhase?: unknown;
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
      if (atom === autoModeEnabledAtom) {
        return autoModeEnabled as never;
      }
      if (atom === etaFallbackActiveAtom) {
        return etaFallbackActive as never;
      }
      if (atom === etaPhaseAtom) {
        return etaPhase as never;
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

    it('ETAフォールバック非稼働時は IDLE と有効フラグを表示する', () => {
      jest
        .spyOn(remoteConfigModule, 'isEtaAssistEnabled')
        .mockReturnValue(false);
      setupAtomValues({ etaFallbackActive: false, etaPhase: null });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-eta-fallback-value')).toHaveTextContent(
        'IDLE'
      );
      expect(getByTestId('dev-overlay-eta-fallback-meta')).toHaveTextContent(
        'assist OFF'
      );
    });

    it('ETAフォールバック稼働時は現在フェーズと対象駅・有効フラグを表示する', () => {
      jest
        .spyOn(remoteConfigModule, 'isEtaAssistEnabled')
        .mockReturnValue(true);
      setupAtomValues({
        etaFallbackActive: true,
        etaPhase: { kind: 'APPROACHING', targetStationId: 42 },
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-eta-fallback-value')).toHaveTextContent(
        'APPROACHING'
      );
      expect(getByTestId('dev-overlay-eta-fallback-meta')).toHaveTextContent(
        'assist ON / #42'
      );
    });

    it('ETAフォールバック稼働時(DWELLING)は停車駅IDを表示する', () => {
      // DWELLINGは targetStationId ではなく stationId を参照するため別途検証する。
      jest
        .spyOn(remoteConfigModule, 'isEtaAssistEnabled')
        .mockReturnValue(true);
      setupAtomValues({
        etaFallbackActive: true,
        etaPhase: { kind: 'DWELLING', stationId: 7 },
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-eta-fallback-value')).toHaveTextContent(
        'DWELLING'
      );
      expect(getByTestId('dev-overlay-eta-fallback-meta')).toHaveTextContent(
        'assist ON / #7'
      );
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

    it('生の精度がBAD_ACCURACY_THRESHOLD以上・MAX_PERMIT_ACCURACY以下の場合は黄字で表示する', () => {
      setupAtomValues({
        rawLocation: {
          coords: { speed: 10, accuracy: BAD_ACCURACY_THRESHOLD },
        },
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      const valueStyle = StyleSheet.flatten(
        getByTestId('dev-overlay-accuracy-value').props.style
      );
      expect(valueStyle.color).toBe('#facc15');
    });

    it('生の精度がMAX_PERMIT_ACCURACYを超える場合は黄字ではなく赤字で表示する', () => {
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

    it('生の精度がBAD_ACCURACY_THRESHOLD未満の場合は黄字にしない', () => {
      setupAtomValues({
        rawLocation: {
          coords: { speed: 10, accuracy: BAD_ACCURACY_THRESHOLD - 1 },
        },
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      const valueStyle = StyleSheet.flatten(
        getByTestId('dev-overlay-accuracy-value').props.style
      );
      expect(valueStyle.color).not.toBe('#facc15');
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
      const { getAllByTestId } = render(<DevOverlay />);
      // マウント時の即時サンプリングで折れ線グラフに1点描かれる
      expect(getAllByTestId('dev-overlay-accuracy-point')).toHaveLength(1);
    });

    it('精度チャートが1秒ごとに無条件で更新される', () => {
      jest.useFakeTimers();
      try {
        const { getAllByTestId } = render(<DevOverlay />);
        // 初回サンプル
        expect(getAllByTestId('dev-overlay-accuracy-point')).toHaveLength(1);

        act(() => {
          jest.advanceTimersByTime(3000);
        });

        // 位置情報イベントが届かなくても interval 由来で履歴が積み増される
        expect(getAllByTestId('dev-overlay-accuracy-point')).toHaveLength(4);
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
        const { getByTestId, queryAllByTestId } = render(<DevOverlay />);
        act(() => {
          jest.advanceTimersByTime(5000);
        });
        // NaN だけが積まれるため buildAccuracyChartSeries 側で全件除外され '---' になる
        expect(getByTestId('dev-overlay-accuracy-history')).toHaveTextContent(
          '---'
        );
        expect(queryAllByTestId('dev-overlay-accuracy-point')).toHaveLength(0);
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
        rawLocation: {
          coords: { speed: null, accuracy: 15 },
        },
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent('0km/h');
    });

    it('速度が負の値の場合に0km/hを表示する', () => {
      setupAtomValues({
        rawLocation: {
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

  describe('オートモード時の表示', () => {
    it('オートモード中はlocationAtomのシミュレーション速度を表示する', () => {
      // オートモード中はGPS測位が停止しrawLocationAtomが更新されないため、
      // useSimulationModeが書き込むlocationAtom側の速度を表示する
      setupAtomValues({
        location: {
          coords: { speed: 25, accuracy: 0 },
        },
        rawLocation: {
          coords: { speed: 0, accuracy: 15 },
        },
        autoModeEnabled: true,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
        '90km/h'
      );
      expect(getByTestId('dev-overlay-accuracy-value')).toHaveTextContent('0m');
    });

    it('オートモード中はrawLocationが無くてもシミュレーション速度を表示する', () => {
      setupAtomValues({
        location: {
          coords: { speed: 13.89, accuracy: 0 },
        },
        rawLocation: null,
        autoModeEnabled: true,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
        '50km/h'
      );
      expect(getByTestId('dev-overlay-accuracy-value')).toHaveTextContent('0m');
    });

    it('オートモードが無効の場合はrawLocationAtomの速度を表示する', () => {
      setupAtomValues({
        location: {
          coords: { speed: 25, accuracy: 0 },
        },
        rawLocation: {
          coords: { speed: 10, accuracy: 15 },
        },
        autoModeEnabled: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
        '36km/h'
      );
      expect(getByTestId('dev-overlay-accuracy-value')).toHaveTextContent(
        '15m'
      );
    });
  });

  describe('速度計算のロジック', () => {
    it('速度が0の場合に0km/hを表示する', () => {
      setupAtomValues({
        rawLocation: {
          coords: { speed: 0, accuracy: 15 },
        },
        backgroundLocationTracking: false,
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent('0km/h');
    });

    it('速度が正の小数値の場合に正しく変換する', () => {
      setupAtomValues({
        rawLocation: {
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
