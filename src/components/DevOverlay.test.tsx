import { act, fireEvent, render } from '@testing-library/react-native';
import * as Application from 'expo-application';
import { useAtomValue } from 'jotai';
import { Dimensions, StyleSheet } from 'react-native';
import { LineType, type Station } from '~/@types/graphql';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import { BAD_ACCURACY_THRESHOLD } from '~/constants/threshold';
import * as remoteConfigModule from '~/lib/remoteConfig';
import { etaAnchorAtom } from '~/store/atoms/etaFallback';
import {
  accuracyHistoryAtom,
  backgroundLocationTrackingAtom,
  locationAccuracyOutlierAtom,
  locationAtom,
  rawLocationAtom,
  smoothingDecisionAtom,
} from '~/store/atoms/location';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import {
  approachingAtom,
  arrivedAtom,
  stationAtom,
} from '~/store/atoms/station';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { getEtaPhaseNow } from '~/utils/etaPhaseNow';
import DevOverlay, {
  getDevOverlayClampedPosition,
  getDevOverlayDragTranslation,
  isDevOverlayRotatedToLandscape,
} from './DevOverlay';

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

// 到着判定の対象と実効閾値は判定側のフックをそのまま読む。DevOverlayの検証対象は
// 「持ち出す値を組み立てられるか」なので、フックの中身はここでは差し替える。
jest.mock('~/hooks/useNearestStation', () => ({
  useNearestStation: jest.fn(),
}));

jest.mock('~/hooks/useThreshold', () => ({
  useThreshold: jest.fn(),
}));

// ETA推定フェーズは常駐atomではなくオンデマンド計算になったため、関数ごとモックする
jest.mock('~/utils/etaPhaseNow', () => ({
  getEtaPhaseNow: jest.fn(() => null),
}));

// クリップボードは react-native core の非推奨 Clipboard を触るため、テストでは差し替える
jest.mock('~/utils/clipboard', () => ({
  copyTextToClipboard: jest.fn(),
}));

// Import mocked hooks for type safety
import { useDistanceToNextStation, useNextStation } from '~/hooks';
import { useNearestStation } from '~/hooks/useNearestStation';
import { useThreshold } from '~/hooks/useThreshold';
import { copyTextToClipboard } from '~/utils/clipboard';
// 補完測位の集計は実体を使う。モックに差し替えると「DevOverlayがgetterを呼んでいるか」
// ではなく「モックの戻り値を貼れるか」しか見られなくなる。
import {
  countLocationHeartbeatFailed,
  countLocationHeartbeatRequested,
  resetLocationHeartbeatStats,
  setLocationHeartbeatState,
} from '~/utils/locationHeartbeatStats';

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
const mockGetEtaPhaseNow = getEtaPhaseNow as jest.MockedFunction<
  typeof getEtaPhaseNow
>;
const mockCopyTextToClipboard = copyTextToClipboard as jest.MockedFunction<
  typeof copyTextToClipboard
>;
const mockUseNearestStation = useNearestStation as jest.MockedFunction<
  typeof useNearestStation
>;
const mockUseThreshold = useThreshold as jest.MockedFunction<
  typeof useThreshold
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
    etaPhase = null,
    etaAnchor = null,
    filterAccuracyHistory = [15],
    smoothingDecision = { skipSmoothing: false, lineType: null },
    currentStation = null,
    arrived = false,
    approaching = false,
    accuracyOutlier = false,
  }: {
    location?: unknown;
    rawLocation?: unknown;
    backgroundLocationTracking?: boolean;
    autoModeEnabled?: boolean;
    etaPhase?: unknown;
    etaAnchor?: unknown;
    filterAccuracyHistory?: number[];
    smoothingDecision?: { skipSmoothing: boolean; lineType: unknown };
    currentStation?: unknown;
    arrived?: boolean;
    approaching?: boolean;
    accuracyOutlier?: boolean;
  } = {}) => {
    mockGetEtaPhaseNow.mockReturnValue(etaPhase as never);
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
      if (atom === etaAnchorAtom) {
        return etaAnchor as never;
      }
      if (atom === accuracyHistoryAtom) {
        return filterAccuracyHistory as never;
      }
      if (atom === smoothingDecisionAtom) {
        return smoothingDecision as never;
      }
      if (atom === stationAtom) {
        return currentStation as never;
      }
      if (atom === arrivedAtom) {
        return arrived as never;
      }
      if (atom === approachingAtom) {
        return approaching as never;
      }
      if (atom === locationAccuracyOutlierAtom) {
        return accuracyOutlier as never;
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
    mockUseNearestStation.mockReturnValue(undefined);
    mockUseThreshold.mockReturnValue({
      arrivedThreshold: 200,
      approachingThreshold: 1000,
    });
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

    it('機能が無効(isEtaAssistEnabled=false)なら ETA FALLBACK / ANCHOR カードを表示しない', () => {
      jest
        .spyOn(remoteConfigModule, 'isEtaAssistEnabled')
        .mockReturnValue(false);
      setupAtomValues({
        etaPhase: null,
        etaAnchor: { stationId: 5, kind: 'DEPARTED', observedAtMs: 88_000 },
      });

      const { queryByTestId } = render(<DevOverlay />);
      expect(queryByTestId('dev-overlay-eta-fallback-value')).toBeNull();
      expect(queryByTestId('dev-overlay-eta-anchor-value')).toBeNull();
    });

    it('ETA推定フェーズがあるときは現在フェーズと対象駅・有効フラグを表示する', () => {
      jest
        .spyOn(remoteConfigModule, 'isEtaAssistEnabled')
        .mockReturnValue(true);
      setupAtomValues({
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

    it('ETA推定フェーズが DWELLING のときは停車駅IDを表示する', () => {
      // DWELLINGは targetStationId ではなく stationId を参照するため別途検証する。
      jest
        .spyOn(remoteConfigModule, 'isEtaAssistEnabled')
        .mockReturnValue(true);
      setupAtomValues({
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

    it('アンカー未設定時は ETA ANCHOR に no anchor を表示する', () => {
      jest
        .spyOn(remoteConfigModule, 'isEtaAssistEnabled')
        .mockReturnValue(true);
      setupAtomValues({ etaAnchor: null });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-eta-anchor-value')).toHaveTextContent(
        '--'
      );
      expect(getByTestId('dev-overlay-eta-anchor-meta')).toHaveTextContent(
        'no anchor'
      );
    });

    it('アンカー設定時は種別・起点駅ID・経過秒を表示する', () => {
      jest
        .spyOn(remoteConfigModule, 'isEtaAssistEnabled')
        .mockReturnValue(true);
      jest.spyOn(Date, 'now').mockReturnValue(100_000);
      setupAtomValues({
        etaAnchor: {
          stationId: 5,
          kind: 'DEPARTED',
          observedAtMs: 88_000, // 12秒前
        },
      });

      const { getByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-eta-anchor-value')).toHaveTextContent(
        'DEPARTED'
      );
      expect(getByTestId('dev-overlay-eta-anchor-meta')).toHaveTextContent(
        '#5 · 12s ago'
      );
    });
  });

  describe('診断情報のコピー', () => {
    // DevOverlay の COPIED_FEEDBACK_DURATION_MS と同値。exportしていないのでここで持つ
    const COPIED_FEEDBACK_DURATION_MS = 1500;

    beforeEach(() => {
      mockCopyTextToClipboard.mockResolvedValue(true);
      resetLocationHeartbeatStats();
    });

    afterEach(() => {
      // 集計はモジュールに溜まるので、他のテストへ持ち越さない
      resetLocationHeartbeatStats();
    });

    it('ボタンを押すと診断情報をクリップボードへ載せる', async () => {
      const { getByTestId } = render(<DevOverlay />);

      fireEvent.press(getByTestId('dev-overlay-copy-button'));
      // コピーはPromiseを返すので、解決後の状態更新までactの中で流す
      await act(async () => {});

      expect(mockCopyTextToClipboard).toHaveBeenCalledTimes(1);
      const copied = JSON.parse(mockCopyTextToClipboard.mock.calls[0][0]);
      // 座標だけでなく実効設定も載っていること。設定が無いと同じ測位でも
      // 挙動を説明できないため、これが欠けると持ち出す意味が薄れる
      expect(copied.config).toMatchObject({
        maxPermitAccuracy: MAX_PERMIT_ACCURACY,
        telemetryEnabled: true,
        autoModeEnabled: false,
      });
      expect(copied.location.raw).toMatchObject({ accuracy: 15 });
      expect(copied.build.appVersion).toBe(
        `${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`
      );
    });

    // 補完測位が測位を一件も得られない区間では pipelineCounts がどれも動かないので、
    // heartbeat が欠けるとダンプから「要求を出していないのか、出しても得られていないのか」が
    // 読めなくなる。スナップショット側のテストは値を直接渡して検証するため、DevOverlayが
    // 渡し忘れてもそちらでは落ちない。コピー経路そのものでも固定する。
    it('補完測位の稼働状態と要求結果も載せる', async () => {
      setLocationHeartbeatState('power-saving');
      countLocationHeartbeatRequested();
      countLocationHeartbeatRequested();
      countLocationHeartbeatFailed(new Error('位置情報を取得できません'));

      const { getByTestId } = render(<DevOverlay />);

      fireEvent.press(getByTestId('dev-overlay-copy-button'));
      await act(async () => {});

      const copied = JSON.parse(mockCopyTextToClipboard.mock.calls[0][0]);
      expect(copied.heartbeat).toEqual({
        state: 'power-saving',
        requested: 2,
        succeeded: 0,
        failed: 1,
        abandoned: 0,
        discarded: 0,
        teardowns: 0,
        lastErrorMessage: '位置情報を取得できません',
      });
    });

    // filterのskipSmoothingとlineTypeは、判定時に1つのatomへまとめて書かれた組を
    // そのまま出す。片方をstationAtomから読み直すと、測位と無関係な路線の
    // 切り替わりで持ち出し時の値だけが進み、両者で検算できなくなる。
    it('平滑化の判定は結果と入力を同じ組のまま出力する', async () => {
      setupAtomValues({
        smoothingDecision: { skipSmoothing: true, lineType: LineType.Subway },
      });
      const { getByTestId } = render(<DevOverlay />);

      fireEvent.press(getByTestId('dev-overlay-copy-button'));
      await act(async () => {});

      const copied = JSON.parse(mockCopyTextToClipboard.mock.calls[0][0]);
      expect(copied.filter).toMatchObject({
        skipSmoothing: true,
        lineType: LineType.Subway,
      });
    });

    it('最寄り駅までの距離を到着判定と同じ0.01m精度で持ち出す', async () => {
      // 既定の1m丸めだと、閾値ぎりぎりのときダンプ上だけ arrivedThreshold との
      // 大小が逆に見える。到着判定(isPointWithinRadius)は 0.01m 精度・strict `<`。
      // 実測ダンプの再現: 都営大江戸線 汐留まで 288.84m / 実効到着圏 295.75m
      setupAtomValues({
        location: {
          coords: {
            speed: 10,
            accuracy: 2000,
            latitude: 35.66237384361426,
            longitude: 139.76338478107792,
          },
        },
      });
      mockUseNearestStation.mockReturnValue({
        id: 9930120,
        name: '汐留',
        latitude: 35.663703,
        longitude: 139.760642,
      } as Station);

      const { getByTestId } = render(<DevOverlay />);
      fireEvent.press(getByTestId('dev-overlay-copy-button'));
      await act(async () => {});

      const copied = JSON.parse(mockCopyTextToClipboard.mock.calls[0][0]);
      expect(copied.state.distanceToNearestStation).toBeCloseTo(288.84, 2);
      // 1m丸め(289)へ戻ると落ちる
      expect(Number.isInteger(copied.state.distanceToNearestStation)).toBe(
        false
      );
    });

    it('押した直後はCOPIED表示になり、一定時間で戻る', async () => {
      jest.useFakeTimers();
      try {
        const { getByTestId, getByText, queryByText } = render(<DevOverlay />);
        expect(getByText('COPY')).toBeTruthy();

        fireEvent.press(getByTestId('dev-overlay-copy-button'));
        await act(async () => {});
        expect(getByText('COPIED')).toBeTruthy();

        act(() => {
          jest.advanceTimersByTime(COPIED_FEEDBACK_DURATION_MS);
        });
        expect(queryByText('COPIED')).toBeNull();
        expect(getByText('COPY')).toBeTruthy();
      } finally {
        jest.useRealTimers();
      }
    });

    it('成功直後にコピーが失敗したらCOPIED表示とタイマーを解除する', async () => {
      // 成功のタイマーが生きている間に失敗すると、古い表示が残って
      // 「最後のコピーは失敗しているのにCOPIEDに見える」状態になる
      jest.useFakeTimers();
      try {
        const { getByTestId, getByText, queryByText } = render(<DevOverlay />);

        fireEvent.press(getByTestId('dev-overlay-copy-button'));
        await act(async () => {});
        expect(getByText('COPIED')).toBeTruthy();

        mockCopyTextToClipboard.mockResolvedValue(false);
        act(() => {
          jest.advanceTimersByTime(COPIED_FEEDBACK_DURATION_MS / 2);
        });
        fireEvent.press(getByTestId('dev-overlay-copy-button'));
        await act(async () => {});

        expect(queryByText('COPIED')).toBeNull();
        expect(getByText('COPY')).toBeTruthy();
      } finally {
        jest.useRealTimers();
      }
    });

    it('クリップボードへ載せられなかった場合はCOPIEDを出さない', async () => {
      // 失敗しているのに成功表示を出すと、貼り付けてみるまで気付けない
      mockCopyTextToClipboard.mockResolvedValue(false);
      const { getByTestId, getByText, queryByText } = render(<DevOverlay />);

      fireEvent.press(getByTestId('dev-overlay-copy-button'));
      await act(async () => {});

      expect(mockCopyTextToClipboard).toHaveBeenCalledTimes(1);
      expect(queryByText('COPIED')).toBeNull();
      expect(getByText('COPY')).toBeTruthy();
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

    it('回転ラッパー配下では物理縦向きのときだけ座標変換が要る', () => {
      expect(isDevOverlayRotatedToLandscape(false, 393, 852)).toBe(true);
      expect(isDevOverlayRotatedToLandscape(false, 852, 393)).toBe(false);
    });

    it('回転ラッパーの外なら物理縦向きでも座標変換しない', () => {
      expect(isDevOverlayRotatedToLandscape(true, 393, 852)).toBe(false);
    });
  });

  describe('位置のクランプ', () => {
    const size = { width: 160, height: 44 };

    it('パネルが画面内に収まるようマージン込みで丸める', () => {
      expect(
        getDevOverlayClampedPosition(
          -50,
          -50,
          size,
          { width: 360, height: 780 },
          12
        )
      ).toEqual({ x: 12, y: 12 });
      expect(
        getDevOverlayClampedPosition(
          9999,
          9999,
          size,
          { width: 360, height: 780 },
          12
        )
      ).toEqual({ x: 188, y: 724 });
    });

    // 回転ラッパーの外に描画される場合、長辺=width に正規化した寸法でクランプすると
    // 横は画面外まで許し、縦は画面の半分までしか動かせなくなる
    it('縦画面の実寸と長辺正規化寸法とでクランプ範囲が変わる', () => {
      const portrait = getDevOverlayClampedPosition(
        9999,
        9999,
        size,
        { width: 360, height: 780 },
        12
      );
      const normalized = getDevOverlayClampedPosition(
        9999,
        9999,
        size,
        { width: 780, height: 360 },
        12
      );
      expect(portrait).toEqual({ x: 188, y: 724 });
      expect(normalized).toEqual({ x: 608, y: 304 });
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

  // Androidのテストプロバイダ経由の測位(GPX再生)はcoords.speedを運んでこず、
  // 欠測がnullではなく0として届く。実測が取れない間だけ変位から算出した値へ落とす。
  describe('実測速度が得られない場合のフォールバック', () => {
    const movingSample = (latitude: number, timestamp: number) => ({
      coords: { latitude, longitude: 139, speed: 0, accuracy: 8 },
      timestamp,
    });

    // DevOverlayはReact.memoでpropsを持たないため、rerender()では再描画されない。
    // 常駐の1秒ティック(nowTick)を進めて、モックし直したatom値を読ませる。
    const advanceOneTick = () => {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    };

    it('coords.speedが0のまま動いている場合は変位から算出した速度を表示する', () => {
      jest.useFakeTimers();
      try {
        setupAtomValues({ rawLocation: movingSample(35, 1000) });
        const { getByTestId } = render(<DevOverlay />);
        expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
          '0km/h'
        );

        // 緯度0.0009度 ≒ 100m を1秒。100m/s = 360km/h
        setupAtomValues({ rawLocation: movingSample(35.0009, 2000) });
        advanceOneTick();

        expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
          '360km/h'
        );
        expect(getByTestId('dev-overlay-speed-meta')).toHaveTextContent(
          '変位から算出'
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('実測速度を一度でも観測したら以降は実測値を使い続ける', () => {
      jest.useFakeTimers();
      try {
        setupAtomValues({
          rawLocation: {
            coords: { latitude: 35, longitude: 139, speed: 10, accuracy: 8 },
            timestamp: 1000,
          },
        });
        const { getByTestId, queryByTestId } = render(<DevOverlay />);
        expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
          '36km/h'
        );

        // 停車して速度が0になっても、変位由来の値では上書きしない
        setupAtomValues({
          rawLocation: {
            coords: {
              latitude: 35.0009,
              longitude: 139,
              speed: 0,
              accuracy: 8,
            },
            timestamp: 2000,
          },
        });
        advanceOneTick();

        expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
          '0km/h'
        );
        expect(queryByTestId('dev-overlay-speed-meta')).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    it('オートモードの切り替えで測位ソースが変わったら判定と基準をやり直す', () => {
      jest.useFakeTimers();
      try {
        // オートモード中はシミュレーションが必ず速度を持つため実測扱いになる
        setupAtomValues({
          location: {
            coords: { latitude: 35, longitude: 139, speed: 25, accuracy: 0 },
            timestamp: 1000,
          },
          autoModeEnabled: true,
        });
        const { getByTestId, queryByTestId } = render(<DevOverlay />);
        expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
          '90km/h'
        );

        // オートモードを抜けるとrawLocationAtomへ参照が移る。シミュレーション由来の
        // 実測フラグを持ち越すと、速度を運んでこない測位でも0km/hに固定されてしまう。
        // ソースが変わった直後は基準も無いため、変位からの算出値も出さない
        setupAtomValues({
          rawLocation: movingSample(35.05, 2000),
          autoModeEnabled: false,
        });
        advanceOneTick();

        expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
          '0km/h'
        );
        expect(queryByTestId('dev-overlay-speed-meta')).toBeNull();

        // 同じソースで2点そろってから算出値へ落ちる
        setupAtomValues({
          rawLocation: movingSample(35.0509, 3000),
          autoModeEnabled: false,
        });
        advanceOneTick();

        expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent(
          '360km/h'
        );
        expect(getByTestId('dev-overlay-speed-meta')).toHaveTextContent(
          '変位から算出'
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('実測が無く算出もできない間は出所ラベルを出さない', () => {
      setupAtomValues({
        rawLocation: {
          coords: { latitude: 35, longitude: 139, speed: 0, accuracy: 8 },
          timestamp: 1000,
        },
      });
      const { getByTestId, queryByTestId } = render(<DevOverlay />);
      expect(getByTestId('dev-overlay-speed-value')).toHaveTextContent('0km/h');
      expect(queryByTestId('dev-overlay-speed-meta')).toBeNull();
    });
  });
});
