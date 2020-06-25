import { useSelector, useDispatch } from 'react-redux';
import { useCallback, Dispatch, useEffect } from 'react';
import { TrainLCDAppState } from '../store';
import getCurrentStationIndex from '../utils/currentStationIndex';
import { isLoopLine, isOsakaLoopLine, isYamanoteLine } from '../utils/loopLine';
import { Line, Station } from '../models/StationAPI';
import { LineDirection } from '../models/Bound';
import { refreshLeftStations } from '../store/actions/navigation';
import { NavigationActionTypes } from '../store/types/navigation';

const useRefreshLeftStations = (
  selectedLine: Line,
  direction: LineDirection
): void => {
  const { stations } = useSelector((state: TrainLCDAppState) => state.station);
  const { station } = useSelector((state: TrainLCDAppState) => state.station);
  const dispatch = useDispatch<Dispatch<NavigationActionTypes>>();

  const getStationsForLoopLine = useCallback(
    (currentStationIndex: number): Station[] => {
      if (direction === 'INBOUND') {
        if (currentStationIndex === 0) {
          // 山手線は折り返す
          return [
            stations[currentStationIndex],
            ...stations.slice().reverse().slice(0, 6),
          ];
        }

        // 環状線表示駅残り少ない
        const inboundPendingStations = stations
          .slice(
            currentStationIndex - 7 > 0 ? currentStationIndex - 7 : 0,
            currentStationIndex + 1
          )
          .reverse();
        // 山手線と大阪環状線はちょっと処理が違う
        if (currentStationIndex < 7 && isOsakaLoopLine(selectedLine?.id)) {
          const nextStations = stations
            .slice()
            .reverse()
            .slice(currentStationIndex - 1, 6);
          return [...inboundPendingStations, ...nextStations];
        }
        if (currentStationIndex < 7 && isYamanoteLine(selectedLine?.id)) {
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

      const outboundPendingStationCount =
        stations.length - currentStationIndex - 1;
      // 環状線表示駅残り少ない
      if (outboundPendingStationCount < 7) {
        return [
          ...stations.slice(currentStationIndex),
          ...stations.slice(0, 7 - outboundPendingStationCount),
        ];
      }

      return stations.slice(currentStationIndex, currentStationIndex + 8);
    },
    [direction, selectedLine, stations]
  );

  const getStations = useCallback(
    (currentStationIndex: number, boundDirection: LineDirection): Station[] => {
      if (boundDirection === 'OUTBOUND') {
        if (currentStationIndex === stations.length) {
          return stations.slice(currentStationIndex > 7 ? 7 : 0, 7).reverse();
        }
        return stations
          .slice(
            currentStationIndex - 7 > 0 ? currentStationIndex - 7 : 0,
            currentStationIndex + 1
          )
          .reverse();
      }
      return stations.slice(currentStationIndex, currentStationIndex + 8);
    },
    [stations]
  );

  useEffect(() => {
    const currentIndex = getCurrentStationIndex(stations, station);
    const loopLine = isLoopLine(selectedLine);
    const leftStations = loopLine
      ? getStationsForLoopLine(currentIndex)
      : getStations(currentIndex, direction);
    dispatch(refreshLeftStations(leftStations));
  }, [
    direction,
    dispatch,
    getStations,
    getStationsForLoopLine,
    selectedLine,
    station,
    stations,
  ]);
};

export default useRefreshLeftStations;
