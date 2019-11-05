import { Action } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { AppState } from '../';
import {
  BOTTOM_CONTENT_TRANSITION_INTERVAL,
  HEADER_CONTENT_TRANSITION_INTERVAL,
} from '../../constants';
import { LineDirection } from '../../models/Bound';
import { ILine, IStation } from '../../models/StationAPI';
import { getCurrentStationIndex } from '../../utils/currentStationIndex';
import {
  getCurrentStationLinesWithoutCurrentLine,
  getNextStationLinesWithoutCurrentLine,
} from '../../utils/jr';
import {
  isLoopLine,
  isOsakaLoopLine,
  isYamanoteLine,
} from '../../utils/loopLine';
import {
  refreshBottomState,
  refreshHeaderState,
  refreshLeftStations,
  updateRefreshHeaderStateIntervalIds,
} from './navigation';

const getStationsForLoopLine = (
  stations: IStation[],
  line: ILine,
  direction: LineDirection,
  currentStationIndex: number,
) => {
  if (direction === 'INBOUND') {
    if (currentStationIndex === 0) {
      // 山手線は折り返す
      return [
        stations[currentStationIndex],
        ...stations
          .slice()
          .reverse()
          .slice(0, 6),
      ];
    }

    // 環状線表示駅残り少ない
    const inboundPendingStations = stations
      .slice(
        currentStationIndex - 7 > 0 ? currentStationIndex - 7 : 0,
        currentStationIndex + 1,
      )
      .reverse();
    // 山手線と大阪環状線はちょっと処理が違う
    if (currentStationIndex < 7 && isOsakaLoopLine(line.id)) {
      const nextStations = stations
        .slice()
        .reverse()
        .slice(currentStationIndex - 1, 6);
      return [...inboundPendingStations, ...nextStations];
    }
    if (currentStationIndex < 7 && isYamanoteLine(line.id)) {
      const nextStations = stations
        .slice()
        .reverse()
        .slice(0, -(inboundPendingStations.length - 8));
      return [...inboundPendingStations, ...nextStations];
    }
    return inboundPendingStations;
  }

  // 環状線折返し駅
  if (currentStationIndex === stations.length - 1) {
    // 山手線は折り返す
    return [stations[currentStationIndex], ...stations.slice(0, 6)];
  }

  const outboundPendingStationCount = stations.length - currentStationIndex - 1;
  // 環状線表示駅残り少ない
  if (outboundPendingStationCount < 7) {
    return [
      ...stations.slice(currentStationIndex),
      ...stations.slice(0, 7 - outboundPendingStationCount),
    ];
  }

  return stations.slice(currentStationIndex, currentStationIndex + 8);
};

const getStations = (
  stations: IStation[],
  currentStationIndex: number,
  boundDirection: LineDirection,
) => {
  if (boundDirection === 'OUTBOUND') {
    if (currentStationIndex === stations.length) {
      return stations.slice(currentStationIndex > 7 ? 7 : 0, 7).reverse();
    }
    return stations
      .slice(
        currentStationIndex - 7 > 0 ? currentStationIndex - 7 : 0,
        currentStationIndex + 1,
      )
      .reverse();
  }
  return stations.slice(currentStationIndex, currentStationIndex + 8);
};

export const refreshLeftStationsAsync = (
  selectedLine: ILine,
  direction: LineDirection,
): ThunkAction<void, AppState, null, Action<string>> => (
  dispatch,
  getState,
) => {
  const allStations = getState().station.stations;
  const nearestStation = getState().station.station;
  const currentIndex = getCurrentStationIndex(allStations, nearestStation);
  const loopLine = isLoopLine(selectedLine);
  const stations = loopLine
    ? getStationsForLoopLine(allStations, selectedLine, direction, currentIndex)
    : getStations(allStations, currentIndex, direction);
  dispatch(refreshLeftStations(stations));
};

let approachingTimer: number;

export const watchApproachingAsync = (): ThunkAction<
  void,
  AppState,
  null,
  Action<string>
> => (dispatch, getState) => {
  const { arrived, approaching, station: nearestStation } = getState().station;
  const { headerState } = getState().navigation;
  if (!nearestStation) {
    return;
  }

  if (arrived) {
    clearTimeout(approachingTimer);
    switch (headerState) {
      case 'NEXT':
      case 'NEXT_KANA':
      case 'ARRIVING':
      case 'ARRIVING_KANA':
        dispatch(refreshHeaderState('CURRENT'));
        break;
    }
    return;
  }

  if (approaching) {
    approachingTimer = setTimeout(() => {
      switch (headerState) {
        case 'ARRIVING':
          dispatch(refreshHeaderState(arrived ? 'CURRENT' : 'ARRIVING_KANA'));
          break;
        default:
          dispatch(refreshHeaderState(arrived ? 'CURRENT' : 'ARRIVING'));
          break;
      }
    }, HEADER_CONTENT_TRANSITION_INTERVAL);
  }
};

export const transitionHeaderStateAsync = (): ThunkAction<
  void,
  AppState,
  null,
  Action<string>
> => (dispatch, getState) => {
  const intervalId = setInterval(() => {
    const { arrived } = getState().station;
    const { headerState, leftStations } = getState().navigation;
    const nearestStation = getState().station.scoredStations[0];
    if (!nearestStation) {
      return;
    }
    switch (headerState) {
      case 'CURRENT':
        if (leftStations.length > 1 && !arrived) {
          dispatch(refreshHeaderState('NEXT'));
          break;
        }
        dispatch(refreshHeaderState('CURRENT_KANA'));
        break;
      case 'CURRENT_KANA':
        if (leftStations.length > 1 && !arrived) {
          dispatch(refreshHeaderState('NEXT'));
          break;
        }
        dispatch(refreshHeaderState('CURRENT'));
        break;
      case 'NEXT':
        if (arrived) {
          dispatch(refreshHeaderState('CURRENT'));
        } else {
          dispatch(refreshHeaderState('NEXT_KANA'));
        }
        break;
      case 'NEXT_KANA':
        if (arrived) {
          dispatch(refreshHeaderState('CURRENT'));
        } else {
          dispatch(refreshHeaderState('NEXT'));
        }
        break;
    }
  }, HEADER_CONTENT_TRANSITION_INTERVAL);
  const prevIds = getState().navigation.refreshHeaderStateIntervalIds;
  dispatch(updateRefreshHeaderStateIntervalIds([...prevIds, intervalId]));
};

export const refreshBottomStateAsync = (
  selectedLine: ILine,
): ThunkAction<void, AppState, null, Action<string>> => (
  dispatch,
  getState,
) => {
  const intervalId = setInterval(() => {
    const { bottomState, leftStations } = getState().navigation;
    const arrived = getState().station.arrived;

    switch (bottomState) {
      case 'LINE':
        if (
          arrived &&
          getCurrentStationLinesWithoutCurrentLine(leftStations, selectedLine)
            .length
        ) {
          dispatch(refreshBottomState('TRANSFER'));
        }
        if (
          !arrived &&
          getNextStationLinesWithoutCurrentLine(leftStations, selectedLine)
            .length
        ) {
          dispatch(refreshBottomState('TRANSFER'));
        }
        break;
      case 'TRANSFER':
        dispatch(refreshBottomState('LINE'));
        break;
    }
  }, BOTTOM_CONTENT_TRANSITION_INTERVAL);
  const prevIds = getState().navigation.refreshHeaderStateIntervalIds;
  dispatch(updateRefreshHeaderStateIntervalIds([...prevIds, intervalId]));
};
