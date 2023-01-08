import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Line, Station } from '../models/StationAPI';
import stationState from '../store/atoms/station';

const useTransferLinesFromStation = (station: Station | null): Line[] => {
  const { stations } = useRecoilValue(stationState);

  const belongingLines = stations.map((s) => s.currentLine);

  const transferLines = useMemo(
    () =>
      station &&
      station.lines
        .filter(
          (line) => belongingLines.findIndex((il) => line.id === il?.id) === -1
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
          const sameLineInPrevStationLineIndex = prevStation.lines.findIndex(
            (pl) => pl.id === line.id
          );
          const sameLineInNextStationLineIndex = nextStation.lines.findIndex(
            (nl) => nl.id === line.id
          );

          if (
            // 次の駅から違う路線に直通している場合並走路線を乗り換え路線として出す
            nextStation.currentLine.id !== station.currentLine?.id
          ) {
            return true;
          }
          if (
            sameLineInPrevStationLineIndex !== -1 &&
            sameLineInNextStationLineIndex !== -1
          ) {
            return false;
          }
          return true;
        }),
    [belongingLines, station, stations]
  );

  return transferLines ?? [];
};

export default useTransferLinesFromStation;
