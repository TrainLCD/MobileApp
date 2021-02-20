import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import getCurrentStationIndex from '../utils/currentStationIndex';
import { isLoopLine, isYamanoteLine } from '../utils/loopLine';
import { Line, Station } from '../models/StationAPI';
import { LineDirection } from '../models/Bound';
import stationState from '../store/atoms/station';
import navigationState from '../store/atoms/navigation';

const useRefreshLeftStations = (
  selectedLine: Line,
  direction: LineDirection
): void => {
  const { station, stations } = useRecoilValue(stationState);
  const [{ trainType }, setNavigation] = useRecoilState(navigationState);

  const getStationsForLoopLine = useCallback(
    (currentStationIndex: number): Station[] => {
      if (direction === 'INBOUND') {
        if (currentStationIndex === 0) {
          // 山手線は折り返す
          return [stations[0], ...stations.slice().reverse().slice(0, 6)];
        }

        // 環状線表示駅残り少ない
        const inboundPendingStations = stations
          .slice(
            currentStationIndex - 7 > 0 ? currentStationIndex - 7 : 0,
            currentStationIndex + 1
          )
          .reverse();
        // 山手線と大阪環状線はちょっと処理が違う
        if (
          currentStationIndex < 7 &&
          !trainType &&
          selectedLine?.id === 11623
        ) {
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
    [direction, selectedLine, stations, trainType]
  );

  const getStations = useCallback(
    (currentStationIndex: number): Station[] => {
      if (direction === 'OUTBOUND') {
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
    [direction, stations]
  );

  useEffect(() => {
    const currentIndex = getCurrentStationIndex(stations, station);
    const loopLine =
      (selectedLine.id === 11623 && !trainType) === false
        ? false
        : isLoopLine(selectedLine);
    const leftStations = loopLine
      ? getStationsForLoopLine(currentIndex)
      : getStations(currentIndex);
    setNavigation((prev) => ({
      ...prev,
      leftStations,
    }));
  }, [
    direction,
    getStations,
    getStationsForLoopLine,
    selectedLine,
    setNavigation,
    station,
    stations,
    trainType,
  ]);
};

export default useRefreshLeftStations;
