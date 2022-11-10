import { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { MarkShape } from '../constants/numbering';
import { getLineMark } from '../lineMark';
import { StationNumber } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import useCurrentLine from './useCurrentLine';
import useCurrentStation from './useCurrentStation';
import useGetLineMark from './useGetLineMark';
import useNextStation from './useNextStation';

const useNumbering = (
  forceCurrent?: boolean
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
    if (forceCurrent) {
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
    forceCurrent,
    nextStation?.stationNumbers,
    nextStation?.threeLetterCode,
  ]);

  const getLineMarkFunc = useGetLineMark();

  const lineMarkShape = useMemo(() => {
    if (
      !arrived &&
      typeof forceCurrent === 'undefined' &&
      nextStation?.currentLine
    ) {
      return getLineMarkFunc(nextStation, nextStation.currentLine)?.shape;
    }

    return line && getLineMark(line)?.shape;
  }, [arrived, forceCurrent, getLineMarkFunc, line, nextStation]);

  return [stationNumber, threeLetterCode, lineMarkShape];
};

export default useNumbering;
