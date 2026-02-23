import type { Line, Station, StationNumber, TrainType } from '~/@types/graphql';
import type { CommonHeaderProps } from '~/components/Header.types';
import type { LineDirection } from '~/models/Bound';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import type { LineState } from '~/store/atoms/line';
import type { NavigationState } from '~/store/atoms/navigation';
import type { StationState } from '~/store/atoms/station';

/**
 * メイン画面E2Eテスト用ヘルパー
 * プライバシー画面・路線選択画面をスキップし、
 * 任意のJotai状態を注入してメイン画面コンポーネントを直接テスト可能にする
 */

export type E2EStationConfig = {
  /** 全駅リスト（路線上の全駅） */
  stations: Station[];
  /** 現在駅 */
  currentStation: Station;
  /** 選択された路線 */
  selectedLine: Line;
  /** 走行方向 */
  selectedDirection: LineDirection;
  /** 方面（終端駅） */
  selectedBound: Station;
  /** 到着済みか */
  arrived?: boolean;
  /** 接近中か */
  approaching?: boolean;
};

/**
 * StationState atomの初期値を構築する
 */
export const buildStationState = (config: E2EStationConfig): StationState => ({
  arrived: config.arrived ?? true,
  approaching: config.approaching ?? false,
  station: config.currentStation,
  stations: config.stations,
  stationsCache: [config.stations],
  pendingStation: null,
  pendingStations: [],
  selectedDirection: config.selectedDirection,
  selectedBound: config.selectedBound,
  wantedDestination: null,
});

/**
 * LineState atomの初期値を構築する
 */
export const buildLineState = (config: E2EStationConfig): LineState => ({
  selectedLine: config.selectedLine,
  pendingLine: null,
});

/**
 * NavigationState atomの初期値を構築する（leftStationsを含む）
 */
export const buildNavigationState = (
  config: E2EStationConfig
): Partial<NavigationState> => {
  const { stations, currentStation, selectedDirection } = config;
  const currentIndex = stations.findIndex(
    (s) => s.groupId === currentStation.groupId
  );
  if (currentIndex === -1) {
    return { leftStations: stations.slice(0, 8) };
  }

  // 環状線の場合
  if (selectedDirection === 'INBOUND') {
    if (currentIndex === 0) {
      return {
        leftStations: [stations[0], ...stations.slice().reverse().slice(0, 7)],
      };
    }
    const pending = stations
      .slice(Math.max(currentIndex - 7, 0), currentIndex + 1)
      .reverse();
    if (currentIndex < 7) {
      const next = stations
        .slice()
        .reverse()
        .slice(0, -(pending.length - 8));
      return { leftStations: [...pending, ...next] };
    }
    return { leftStations: pending };
  }

  // OUTBOUND
  if (currentIndex === stations.length - 1) {
    return {
      leftStations: [stations[currentIndex], ...stations.slice(0, 7)],
    };
  }
  const remaining = stations.length - currentIndex - 1;
  if (remaining < 7) {
    return {
      leftStations: [
        ...stations.slice(currentIndex),
        ...stations.slice(0, 7 - remaining),
      ],
    };
  }
  return { leftStations: stations.slice(currentIndex, currentIndex + 8) };
};

/**
 * HeaderのCommonHeaderPropsを構築する
 */
export const buildHeaderProps = (
  config: E2EStationConfig,
  overrides: {
    headerLangState?: HeaderLangState;
    isLast?: boolean;
    firstStop?: boolean;
  } = {}
): CommonHeaderProps => {
  const { currentStation, selectedLine, selectedBound, arrived } = config;
  const stations = config.stations;
  const currentIndex = stations.findIndex(
    (s) => s.groupId === currentStation.groupId
  );
  const nextStation =
    config.selectedDirection === 'INBOUND'
      ? stations[currentIndex + 1]
      : stations[currentIndex - 1];

  const headerLangState = overrides.headerLangState ?? 'JA';
  const stationText =
    headerLangState === 'EN'
      ? (currentStation.nameRoman ?? '')
      : (currentStation.name ?? '');

  const stateText = arrived ? '' : headerLangState === 'EN' ? 'Next' : '次は';

  const boundText =
    headerLangState === 'EN'
      ? (selectedBound.nameRoman ?? '')
      : (selectedBound.name ?? '');

  const currentStationNumber: StationNumber | undefined =
    currentStation.stationNumbers?.[0] ?? undefined;

  return {
    currentStation,
    currentLine: selectedLine,
    nextStation,
    selectedBound,
    arrived: arrived ?? true,
    headerState: arrived ? 'CURRENT' : 'NEXT',
    headerTransitionDelay: 300,
    headerLangState,
    stationText,
    stateText,
    stateTextRight: '',
    boundText,
    currentStationNumber,
    threeLetterCode: currentStation.threeLetterCode ?? undefined,
    numberingColor: selectedLine.color ?? '#000',
    trainType: null,
    isLast: overrides.isLast ?? false,
    firstStop: overrides.firstStop ?? false,
    connectedLines: [],
    connectionText: '',
    isJapaneseState: headerLangState === 'JA' || headerLangState === 'KANA',
  };
};
