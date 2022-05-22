import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { StationNumber } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getNextStation from '../utils/getNextStation';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';

const useNumbering = (): StationNumber | undefined => {
  const { arrived, station, selectedDirection, rawStations } =
    useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { leftStations } = useRecoilValue(navigationState);

  const [stationNumber, setStationNumber] = useState<StationNumber>();

  // TODO: どこかに切り出す(Permitted.tsxに同じコードがある)
  const nextStation = useMemo(() => {
    const actualNextStation = getNextStation(leftStations, station);

    const nextInboundStopStation = getNextInboundStopStation(
      rawStations,
      actualNextStation,
      station
    );
    const nextOutboundStopStation = getNextOutboundStopStation(
      rawStations,
      actualNextStation,
      station
    );

    return selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation;
  }, [leftStations, selectedDirection, station, rawStations]);

  const getCurrentStationNumber = useCallback(() => {
    if (arrived) {
      const currentStation = rawStations.find(
        (rs) =>
          rs.groupId === station?.groupId &&
          (rs.currentLine ? rs.currentLine?.id === selectedLine?.id : true)
      );
      setStationNumber(currentStation?.stationNumbers[0]);
    } else {
      setStationNumber(nextStation?.stationNumbers[0]);
    }
  }, [
    arrived,
    nextStation?.stationNumbers,
    rawStations,
    selectedLine?.id,
    station?.groupId,
  ]);

  useEffect(() => {
    getCurrentStationNumber();
  }, [getCurrentStationNumber]);

  return stationNumber;
};

export default useNumbering;
