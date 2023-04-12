import { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { MarkShape } from '../constants/numbering';
import { StationNumber } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import useCurrentStation from './useCurrentStation';
import useGetLineMark from './useGetLineMark';
import useNextStation from './useNextStation';

const useNumbering = (
  priorCurrent?: boolean
): [
  StationNumber | undefined,
  string | undefined,
  MarkShape | null | undefined
] => {
  const { arrived, selectedBound } = useRecoilValue(stationState);

  const [stationNumber, setStationNumber] = useState<StationNumber>();
  const [threeLetterCode, setThreeLetterCode] = useState<string>();

  const nextStation = useNextStation();
  const currentStation = useCurrentStation();

  useEffect(() => {
    if (!selectedBound || !currentStation) {
      return;
    }
    if (priorCurrent && !getIsPass(currentStation)) {
      setStationNumber(currentStation?.stationNumbers?.[0]);
      setThreeLetterCode(currentStation?.threeLetterCode);
      return;
    }
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
      return;
    }
    setStationNumber(nextStation?.stationNumbers?.[0]);
    setThreeLetterCode(nextStation?.threeLetterCode);
  }, [
    arrived,
    currentStation,
    currentStation?.stationNumbers,
    currentStation?.threeLetterCode,
    priorCurrent,
    nextStation?.stationNumbers,
    nextStation?.threeLetterCode,
    selectedBound,
  ]);

  const getLineMarkFunc = useGetLineMark();

  const lineMarkShape = useMemo(() => {
    const currentStationLineMark =
      currentStation &&
      getLineMarkFunc({
        station: currentStation,
        line: currentStation.currentLine,
      });
    const nextStationLineMark =
      nextStation &&
      getLineMarkFunc({ station: nextStation, line: nextStation.currentLine });

    if (priorCurrent && currentStation && !getIsPass(currentStation)) {
      return currentStationLineMark?.signShape;
    }

    if (arrived && currentStation) {
      return getIsPass(currentStation)
        ? nextStationLineMark?.currentLineMark?.signShape
        : currentStationLineMark?.currentLineMark?.signShape;
    }
    return nextStationLineMark?.currentLineMark?.signShape;
  }, [arrived, currentStation, getLineMarkFunc, nextStation, priorCurrent]);

  return [stationNumber, threeLetterCode, lineMarkShape];
};

export default useNumbering;
