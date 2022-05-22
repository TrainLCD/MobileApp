import { useEffect, useMemo, useState } from 'react';
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

const useNumbering = (): [StationNumber | undefined, string | undefined] => {
  const { arrived, station, selectedDirection, rawStations } =
    useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { leftStations } = useRecoilValue(navigationState);

  const [stationNumber, setStationNumber] = useState<StationNumber>();
  const [threeLetterCode, setThreeLetterCode] = useState<string>();

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

  const currentStation = useMemo(
    () =>
      rawStations.find(
        (rs) =>
          rs.groupId === station?.groupId &&
          (rs.currentLine ? rs.currentLine?.id === selectedLine?.id : true)
      ),
    [rawStations, selectedLine?.id, station?.groupId]
  );

  useEffect(() => {
    if (arrived) {
      setStationNumber(currentStation?.stationNumbers[0]);
      setThreeLetterCode(currentStation?.threeLetterCode);
    } else {
      setStationNumber(nextStation?.stationNumbers[0]);
      setThreeLetterCode(nextStation?.threeLetterCode);
    }
  }, [
    arrived,
    currentStation?.stationNumbers,
    currentStation?.threeLetterCode,
    nextStation?.stationNumbers,
    nextStation?.threeLetterCode,
  ]);

  return [stationNumber, threeLetterCode];
};

export default useNumbering;
