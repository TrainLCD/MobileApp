import { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { MarkShape } from '../constants/numbering';
import { StationNumber } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import useCurrentLine from './useCurrentLine';
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
  const { arrived } = useRecoilValue(stationState);

  const [stationNumber, setStationNumber] = useState<StationNumber>();
  const [threeLetterCode, setThreeLetterCode] = useState<string>();
  const line = useCurrentLine();

  const nextStation = useNextStation();
  const currentStation = useCurrentStation();

  useEffect(() => {
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
  ]);

  const getLineMarkFunc = useGetLineMark();

  const lineMarkShape = useMemo(() => {
    if (
      (!arrived && !priorCurrent && nextStation?.currentLine) ||
      (getIsPass(currentStation) && nextStation?.currentLine)
    ) {
      return getLineMarkFunc(nextStation, nextStation.currentLine)?.shape;
    }

    return (
      currentStation && line && getLineMarkFunc(currentStation, line)?.shape
    );
  }, [
    arrived,
    currentStation,
    getLineMarkFunc,
    line,
    nextStation,
    priorCurrent,
  ]);

  return [stationNumber, threeLetterCode, lineMarkShape];
};

export default useNumbering;
