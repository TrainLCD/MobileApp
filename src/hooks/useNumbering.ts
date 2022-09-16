import { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { MarkShape } from '../constants/numbering';
import { getLineMark } from '../lineMark';
import { StationNumber } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';
import useCurrentLine from './useCurrentLine';

const useNumbering = (): [
  StationNumber | undefined,
  string | undefined,
  MarkShape | null | undefined
] => {
  const { arrived, station, selectedDirection, rawStations } =
    useRecoilValue(stationState);
  const { leftStations } = useRecoilValue(navigationState);

  const [stationNumber, setStationNumber] = useState<StationNumber>();
  const [threeLetterCode, setThreeLetterCode] = useState<string>();
  const line = useCurrentLine();

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
          (rs.currentLine ? rs.currentLine?.id === line?.id : true)
      ),
    [rawStations, line?.id, station?.groupId]
  );

  useEffect(() => {
    if (arrived) {
      setStationNumber(
        getIsPass(currentStation)
          ? nextStation?.stationNumbers?.[0]
          : currentStation?.stationNumbers?.[0]
      );
      setThreeLetterCode(
        getIsPass(currentStation)
          ? nextStation?.threeLetterCode
          : currentStation?.threeLetterCode
      );
    } else {
      setStationNumber(nextStation?.stationNumbers?.[0]);
      setThreeLetterCode(nextStation?.threeLetterCode);
    }
  }, [
    arrived,
    currentStation,
    currentStation?.stationNumbers,
    currentStation?.threeLetterCode,
    nextStation?.stationNumbers,
    nextStation?.threeLetterCode,
  ]);

  const lineMarkShape = useMemo(() => {
    if (!arrived && nextStation?.currentLine) {
      return getLineMark(nextStation.currentLine)?.shape;
    }

    return line && getLineMark(line)?.shape;
  }, [arrived, line, nextStation?.currentLine]);

  return [stationNumber, threeLetterCode, lineMarkShape];
};

export default useNumbering;
