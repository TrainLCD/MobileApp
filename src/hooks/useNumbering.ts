import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { MarkShape } from '../constants/numbering';
import { StationNumber } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { getIsLocal } from '../utils/localType';
import useCurrentStation from './useCurrentStation';
import useCurrentTrainType from './useCurrentTrainType';
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

  const trainType = useCurrentTrainType();
  const nextStation = useNextStation();
  const currentStation = useCurrentStation();

  // 種別が各駅停車もしくは種別設定なしの場合は0番目のstationNumberを使う
  // 各停以外かつ2つ以上のstationNumberが設定されていれば1番目のstationNumberを使う
  // TODO: ↑の仕様をどこかに書く
  const getStationNumberIndex = useCallback(
    (stationNumbers: StationNumber[]) => {
      const isLocal = trainType && getIsLocal(trainType);
      if (!trainType || isLocal) {
        return 0;
      }
      if (!isLocal && (stationNumbers.length ?? 0) > 1) {
        return 1;
      }
      return 0;
    },
    [trainType]
  );
  const currentStationNumberIndex = useMemo(
    () => getStationNumberIndex(currentStation?.stationNumbers ?? []),
    [currentStation?.stationNumbers, getStationNumberIndex]
  );
  const nextStationNumberIndex = useMemo(
    () => getStationNumberIndex(nextStation?.stationNumbers ?? []),
    [nextStation?.stationNumbers, getStationNumberIndex]
  );

  useEffect(() => {
    if (!selectedBound) {
      setStationNumber(undefined);
      setThreeLetterCode(undefined);
    }
  }, [selectedBound]);

  useEffect(() => {
    if (!selectedBound || !currentStation) {
      return;
    }
    if (priorCurrent && !getIsPass(currentStation)) {
      setStationNumber(
        currentStation?.stationNumbers?.[currentStationNumberIndex]
      );
      setThreeLetterCode(currentStation?.threeLetterCode);
      return;
    }
    if (arrived) {
      setStationNumber(
        getIsPass(currentStation)
          ? nextStation?.stationNumbers?.[nextStationNumberIndex]
          : currentStation?.stationNumbers?.[currentStationNumberIndex]
      );
      setThreeLetterCode(
        getIsPass(currentStation)
          ? nextStation?.threeLetterCode
          : currentStation?.threeLetterCode
      );
      return;
    }
    setStationNumber(nextStation?.stationNumbers?.[nextStationNumberIndex]);
    setThreeLetterCode(nextStation?.threeLetterCode);
  }, [
    arrived,
    currentStation,
    currentStationNumberIndex,
    nextStation?.stationNumbers,
    nextStation?.threeLetterCode,
    nextStationNumberIndex,
    priorCurrent,
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
