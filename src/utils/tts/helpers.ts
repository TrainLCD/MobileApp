import type { Line, Station, StationNumber, TrainType } from '~/@types/graphql';
import {
  MEIJO_LINE_ID,
  OSAKA_LOOP_LINE_ID,
  parenthesisRegexp,
  TOEI_OEDO_LINE_ID,
  YAMANOTE_LINE_ID,
} from '~/constants';
import type { LineState } from '~/store/atoms/line';
import type { NavigationState } from '~/store/atoms/navigation';
import type { StationState } from '~/store/atoms/station';
import type { HeaderStoppingState } from '../../models/HeaderTransitionState';
import dropEitherJunctionStation from '../dropJunctionStation';
import getIsPass from '../isPass';
import { isBusLine } from '../line';
import { getIsLocal } from '../trainTypeString';

// getCurrentStation の純粋関数版
export const getCurrentStation = (
  stationState: StationState,
  skipPassStation = false
): Station | undefined => {
  const {
    stations,
    station: stationFromState,
    selectedDirection,
  } = stationState;

  const station =
    stations.find((s) => s.id === stationFromState?.id) ??
    stations.find((s) => s.groupId === stationFromState?.groupId);

  if (!skipPassStation) {
    return station ?? stationFromState ?? undefined;
  }

  const foundStation = stations
    .filter((s) => !getIsPass(s))
    .find((rs) => rs.id === station?.id);

  if (foundStation) {
    return foundStation;
  }

  const reversedStations =
    selectedDirection === 'INBOUND' ? stations : stations.slice().reverse();

  const curIndex = reversedStations.findIndex((s) => s.id === station?.id);
  if (curIndex === -1) {
    return undefined;
  }

  const stationsFromRange = reversedStations
    .slice(0, curIndex)
    .filter((s) => !getIsPass(s));
  return stationsFromRange[stationsFromRange.length - 1];
};

// getCurrentLine の純粋関数版
export const getCurrentLine = (
  stationState: StationState,
  lineState: LineState
): Line | null => {
  const { stations, selectedDirection } = stationState;
  const { selectedLine } = lineState;
  const currentStation = getCurrentStation(stationState);

  const actualCurrentStation = (
    selectedDirection === 'INBOUND' ? stations.slice().reverse() : stations
  ).find((rs) => rs.groupId === currentStation?.groupId);

  return (selectedLine && actualCurrentStation?.line) ?? null;
};

// getCurrentTrainType の純粋関数版
export const getCurrentTrainType = (
  stationState: StationState,
  lineState: LineState,
  navigationState: NavigationState
): TrainType | null => {
  const { stations } = stationState;
  const { trainType } = navigationState;
  const currentStation = getCurrentStation(stationState, true);
  const currentLine = getCurrentLine(stationState, lineState);

  if (!trainType) {
    return null;
  }

  // 選択した路線と選択した種別に紐づいている路線が違う時に選んだ方面の種別と合わせる
  if (currentStation?.line?.id !== currentLine?.id) {
    const actualTrainType = stations.find(
      (s: Station) => s?.id === currentLine?.station?.id
    )?.trainType;
    return actualTrainType ?? null;
  }

  if (!getIsPass(currentStation)) {
    return currentStation?.trainType ?? null;
  }

  return trainType;
};

// getLoopLineInfo の純粋関数版
export const getLoopLineInfo = (
  stationState: StationState,
  lineState: LineState,
  navigationState: NavigationState
) => {
  const { stations } = stationState;
  const currentLine = getCurrentLine(stationState, lineState);
  const trainType = getCurrentTrainType(
    stationState,
    lineState,
    navigationState
  );

  const line = currentLine;

  const isYamanoteLine = line
    ? line.id === YAMANOTE_LINE_ID
    : stations.every((s) => s.line?.id === YAMANOTE_LINE_ID);

  const isOsakaLoopLine = line
    ? line.id === OSAKA_LOOP_LINE_ID
    : stations.every((s) => s.line?.id === OSAKA_LOOP_LINE_ID);

  const isMeijoLine = line
    ? line.id === MEIJO_LINE_ID
    : stations.every((s) => s.line?.id === MEIJO_LINE_ID);

  const isOedoLine = line
    ? line.id === TOEI_OEDO_LINE_ID
    : stations.every((s) => s.line?.id === TOEI_OEDO_LINE_ID);

  const isLoopLine = (() => {
    if (trainType && !getIsLocal(trainType)) {
      return false;
    }
    return isYamanoteLine || isOsakaLoopLine || isMeijoLine;
  })();

  const isPartiallyLoopLine = line
    ? line.id === TOEI_OEDO_LINE_ID
    : stations.every((s) => s.line?.id === TOEI_OEDO_LINE_ID);

  return {
    isYamanoteLine,
    isOsakaLoopLine,
    isMeijoLine,
    isOedoLine,
    isLoopLine,
    isPartiallyLoopLine,
  };
};

// getNextStation の純粋関数版
export const getNextStation = (
  stationState: StationState,
  lineState: LineState,
  navigationState: NavigationState,
  ignorePass = true
): Station | undefined => {
  const { stations: stationsFromState, selectedDirection } = stationState;
  const currentStation = getCurrentStation(stationState);
  const { isLoopLine } = getLoopLineInfo(
    stationState,
    lineState,
    navigationState
  );

  const stations = dropEitherJunctionStation(
    stationsFromState,
    selectedDirection
  );

  const stationIndex = (() => {
    const index = stations.findIndex((s) => s.id === currentStation?.id);
    if (index !== -1) {
      return index;
    }
    return stations.findIndex((s) => s.groupId === currentStation?.groupId);
  })();

  const outboundStationIndex = (() => {
    const reversed = stations.slice().reverse();
    const index = reversed.findIndex((s) => s.id === currentStation?.id);
    if (index !== -1) {
      return index;
    }
    return reversed.findIndex((s) => s.groupId === currentStation?.groupId);
  })();

  const actualNextStation = (() => {
    if (stationIndex === -1) {
      return undefined;
    }

    if (isLoopLine) {
      const loopLineStationIndex =
        selectedDirection === 'INBOUND' ? stationIndex - 1 : stationIndex + 1;

      if (!stations[loopLineStationIndex]) {
        return stations[
          selectedDirection === 'INBOUND' ? stations.length - 1 : 0
        ];
      }

      return stations[loopLineStationIndex];
    }

    const notLoopLineStationIndex =
      selectedDirection === 'INBOUND' ? stationIndex + 1 : stationIndex - 1;

    return stations[notLoopLineStationIndex];
  })();

  const nextInboundStopStation = (() => {
    if (stationIndex === -1) {
      return undefined;
    }

    return actualNextStation && getIsPass(actualNextStation) && ignorePass
      ? stations
          .slice(stationIndex - stations.length + 1)
          .find((s) => !getIsPass(s))
      : actualNextStation;
  })();

  const nextOutboundStopStation = (() => {
    if (outboundStationIndex === -1) {
      return undefined;
    }

    return actualNextStation && getIsPass(actualNextStation) && ignorePass
      ? stations
          .slice()
          .reverse()
          .slice(outboundStationIndex - stations.length + 1)
          .find((s) => !getIsPass(s))
      : actualNextStation;
  })();

  return selectedDirection === 'INBOUND'
    ? nextInboundStopStation
    : nextOutboundStopStation;
};

// getStoppingState の純粋関数版
export const getStoppingState = (
  stationState: StationState,
  lineState: LineState,
  navigationState: NavigationState
): HeaderStoppingState => {
  const { arrived, approaching } = stationState;
  const currentStation = getCurrentStation(stationState);
  const nextStation = getNextStation(stationState, lineState, navigationState);

  if ((arrived && !getIsPass(currentStation)) || !nextStation) {
    return 'CURRENT';
  }
  if (approaching && !arrived && !getIsPass(nextStation)) {
    return 'ARRIVING';
  }
  return 'NEXT';
};

// getTransferLinesFromStation の純粋関数版
export const getTransferLinesFromStation = (
  station: Station | undefined,
  stations: Station[],
  omitRepeatingLine = false
): Line[] => {
  const transferLines = station?.lines
    ?.filter((line) => !isBusLine(line))
    ?.filter((line) => line.id !== station.line?.id)
    .filter(
      (line) =>
        line.nameShort?.replace(parenthesisRegexp, '') !==
        station.line?.nameShort?.replace(parenthesisRegexp, '')
    )
    .filter((line) => {
      const currentStationIndex = stations.findIndex(
        (s) => s.id === station.id
      );
      const prevStation = stations[currentStationIndex - 1];
      const nextStation = stations[currentStationIndex + 1];
      if (!prevStation || !nextStation) {
        return true;
      }
      const hasSameLineInPrevStationLine = prevStation.lines?.some(
        (pl) => pl.id === line.id
      );
      const hasSameLineInNextStationLine = nextStation.lines?.some(
        (nl) => nl.id === line.id
      );

      if (nextStation.line?.id !== station.line?.id) {
        return true;
      }
      if (
        omitRepeatingLine &&
        hasSameLineInPrevStationLine &&
        hasSameLineInNextStationLine
      ) {
        return false;
      }
      return true;
    });

  return (transferLines ?? []).map((l) => ({
    ...l,
    nameShort: l.nameShort?.replace(parenthesisRegexp, ''),
    nameRoman: l.nameRoman?.replace(parenthesisRegexp, ''),
  }));
};

// getTransferLines の純粋関数版
export const getTransferLines = (
  stationState: StationState,
  lineState: LineState,
  navigationState: NavigationState
): Line[] => {
  const { arrived, stations } = stationState;
  const currentStation = getCurrentStation(stationState, false);
  const nextStation = getNextStation(stationState, lineState, navigationState);

  const targetStation =
    arrived && currentStation && !getIsPass(currentStation)
      ? currentStation
      : nextStation;

  return getTransferLinesFromStation(targetStation, stations);
};

// getConnectedLines の純粋関数版 (簡略化版)
// TTSに必要な直通路線情報を取得
export const getConnectedLines = (
  stationState: StationState,
  lineState: LineState
): Line[] => {
  const { selectedBound, selectedDirection, stations } = stationState;
  const currentLine = getCurrentLine(stationState, lineState);

  if (!selectedBound || !currentLine) {
    return [];
  }

  // 駅リストから路線を抽出（重複を除く）
  const belongLines: Line[] = [];
  let lastLineId: number | null | undefined = null;

  for (const s of stations) {
    if (s.line && s.line.id !== lastLineId) {
      belongLines.push(s.line as Line);
      lastLineId = s.line.id;
    }
  }

  // 現在の路線のインデックス
  const currentLineIndex = belongLines.findIndex(
    (l) => l.id === currentLine.id
  );

  if (currentLineIndex === -1) {
    return [];
  }

  // 方向に応じて直通先路線を取得
  const connectedLines =
    selectedDirection === 'INBOUND'
      ? belongLines.slice(currentLineIndex + 1)
      : belongLines.slice(0, currentLineIndex).reverse();

  // 同じ名前の路線を除外
  return connectedLines
    .filter(
      (l) =>
        l.nameShort?.replace(parenthesisRegexp, '') !==
        currentLine.nameShort?.replace(parenthesisRegexp, '')
    )
    .map((l) => ({
      ...l,
      nameShort: l.nameShort?.replace(parenthesisRegexp, ''),
      nameRoman: l.nameRoman?.replace(parenthesisRegexp, ''),
    }));
};

// getSlicedStations の純粋関数版
export const getSlicedStations = (
  stationState: StationState,
  lineState: LineState,
  navigationState: NavigationState
): Station[] => {
  const { stations, selectedDirection } = stationState;
  const currentStation = getCurrentStation(stationState);
  const { isLoopLine } = getLoopLineInfo(
    stationState,
    lineState,
    navigationState
  );

  const actualCurrentStationIndex = stations.findIndex(
    (s) => s.groupId === currentStation?.groupId
  );

  if (isLoopLine) {
    return [
      ...stations.slice(actualCurrentStationIndex),
      ...stations.slice(0, actualCurrentStationIndex),
    ];
  }

  if (selectedDirection === 'INBOUND') {
    return stations.slice(actualCurrentStationIndex);
  }
  return stations.slice(0, actualCurrentStationIndex + 1).reverse();
};

// getAfterNextStation の純粋関数版
export const getAfterNextStation = (
  stationState: StationState,
  lineState: LineState,
  navigationState: NavigationState
): Station | undefined => {
  const nextStation = getNextStation(stationState, lineState, navigationState);
  const slicedStations = getSlicedStations(
    stationState,
    lineState,
    navigationState
  );

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ
  const uniqueSlicedStations = Array.from(
    new Set(slicedStations.map((s) => s.groupId))
  )
    .map((gid) => slicedStations.find((s) => s.groupId === gid))
    .filter((s): s is Station => !!s);

  const nextIndex = uniqueSlicedStations.findIndex(
    (s) => s.groupId === nextStation?.groupId
  );

  if (nextIndex === -1) {
    return undefined;
  }

  // 次の駅より後ろで、通過駅でない最初の駅を探す
  for (let i = nextIndex + 1; i < uniqueSlicedStations.length; i++) {
    const station = uniqueSlicedStations[i];
    if (!getIsPass(station)) {
      return station;
    }
  }

  return undefined;
};

// isTerminus の純粋関数版
export const isTerminus = (
  station: Station | undefined,
  stationState: StationState,
  lineState: LineState,
  navigationState: NavigationState
): boolean => {
  const { selectedBound } = stationState;
  const { isLoopLine } = getLoopLineInfo(
    stationState,
    lineState,
    navigationState
  );

  if (!station || isLoopLine) {
    return false;
  }

  return station.groupId === selectedBound?.groupId;
};

// getLoopLineBound の純粋関数版
export const getLoopLineBound = (
  stationState: StationState,
  lineState: LineState,
  navigationState: NavigationState,
  language: 'JA' | 'EN'
): { boundFor: string; boundForKatakana: string } | null => {
  const { stations, selectedDirection } = stationState;
  const currentStation = getCurrentStation(stationState);
  const loopInfo = getLoopLineInfo(stationState, lineState, navigationState);
  const { isLoopLine, isYamanoteLine, isOsakaLoopLine, isMeijoLine } = loopInfo;

  if (!isLoopLine) {
    return { boundFor: '', boundForKatakana: '' };
  }

  // major station IDsを取得
  const majorStationIdSet = (() => {
    if (isYamanoteLine) {
      return new Set([
        1130205, // 渋谷
        1130208, // 新宿
        1130212, // 池袋
        1130220, // 上野
        1130224, // 東京
        1130227, // 品川
      ]);
    }
    if (isOsakaLoopLine) {
      return new Set([
        1162310, // 大阪
        1162301, // 天王寺
        1162315, // 京橋
        1162306, // 新今宮
      ]);
    }
    if (isMeijoLine) {
      return new Set([
        9936801, // 栄
        9936810, // 金山
        9936818, // 本山
        9936826, // 名古屋大学
      ]);
    }
    return new Set<number>();
  })();

  const getMajorStations = (stationList: Station[], reverse: boolean) => {
    const targetStations = reverse
      ? stationList.slice().reverse()
      : stationList;
    const currentStationIndex = targetStations.findIndex(
      (s) => s.groupId === currentStation?.groupId
    );

    const seenGroupIds = new Set<number>();
    const majorStations = [
      ...targetStations.slice(currentStationIndex),
      ...targetStations.slice(0, currentStationIndex),
    ].filter((s) => {
      if (s.id === undefined || s.id === null || !majorStationIdSet.has(s.id)) {
        return false;
      }
      if (s.groupId === currentStation?.groupId) {
        return false;
      }
      if (s.groupId != null && seenGroupIds.has(s.groupId)) {
        return false;
      }
      if (s.groupId != null) {
        seenGroupIds.add(s.groupId);
      }
      return true;
    });

    return majorStations.slice(0, 2);
  };

  const boundStations =
    selectedDirection === 'INBOUND'
      ? getMajorStations(stations, true)
      : getMajorStations(stations, false);

  const boundFor =
    language === 'EN'
      ? boundStations.map((s) => s.nameRoman).join(' & ')
      : `${boundStations.map((s) => s.name).join('・')}方面`;

  const boundForKatakana = `${boundStations.map((s) => s.nameKatakana).join('・')}ホウメン`;

  return { boundFor, boundForKatakana };
};

// getBounds の純粋関数版 (directionalStops only)
export const getDirectionalStops = (
  stationState: StationState,
  lineState: LineState,
  navigationState: NavigationState
): Station[] => {
  const { stations, selectedDirection, selectedBound } = stationState;
  const currentStation = getCurrentStation(stationState);
  const { isLoopLine } = getLoopLineInfo(
    stationState,
    lineState,
    navigationState
  );

  if (isLoopLine || !selectedBound) {
    return [];
  }

  const currentStationIndex = stations.findIndex(
    (s) => s.groupId === currentStation?.groupId
  );

  if (selectedDirection === 'INBOUND') {
    const filtered = stations
      .slice(currentStationIndex)
      .filter((s) => !getIsPass(s));
    return [filtered[filtered.length - 1]].filter((s): s is Station => !!s);
  }

  const reversed = stations.slice().reverse();
  const reversedCurrentIndex = reversed.findIndex(
    (s) => s.groupId === currentStation?.groupId
  );
  const filtered = reversed
    .slice(reversedCurrentIndex)
    .filter((s) => !getIsPass(s));
  return [filtered[filtered.length - 1]].filter((s): s is Station => !!s);
};

// getStationNumberIndex の純粋関数版
export const getStationNumberIndex = (
  station: Station | undefined,
  line: Line | null
): number => {
  return (
    line?.lineSymbols?.findIndex(({ symbol }) =>
      station?.stationNumbers?.some(({ lineSymbol }) => symbol === lineSymbol)
    ) ?? 0
  );
};

// getNextStationNumber の純粋関数版
export const getNextStationNumber = (
  stationState: StationState,
  lineState: LineState,
  navigationState: NavigationState
): StationNumber | undefined => {
  const nextStation = getNextStation(stationState, lineState, navigationState);
  const currentLine = getCurrentLine(stationState, lineState);

  if (!nextStation?.stationNumbers) {
    return undefined;
  }

  const stationNumberIndex = getStationNumberIndex(nextStation, currentLine);
  if (
    !Number.isInteger(stationNumberIndex) ||
    stationNumberIndex < 0 ||
    stationNumberIndex >= nextStation.stationNumbers.length
  ) {
    return undefined;
  }

  return nextStation.stationNumbers[stationNumberIndex];
};
