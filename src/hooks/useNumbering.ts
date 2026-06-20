import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { type StationNumber, TrainTypeKind } from '~/@types/graphql';
import { JOBAN_LINE_IDS } from '../constants';
import { arrivedAtom, selectedBoundAtom } from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';

export const useNumbering = (
  priorCurrent = false,
  firstStop = false
): [StationNumber | undefined, string | undefined] => {
  const arrived = useAtomValue(arrivedAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const stoppedCurrentStation = useCurrentStation(true);
  const trainType = useCurrentTrainType();

  const [stationNumber, setStationNumber] = useState<StationNumber>();
  const [threeLetterCode, setThreeLetterCode] = useState<string>();

  const currentLine = useCurrentLine();
  const currentStation = useCurrentStation();
  // まもなく表示時は現在地基準で接近している駅の番号を表示する
  const nextStation = useDisplayNextStation();

  const getStationNumberIndex = useStationNumberIndexFunc();

  const targetStation = useMemo(
    () => (firstStop ? (selectedBound ?? undefined) : stoppedCurrentStation),
    [firstStop, selectedBound, stoppedCurrentStation]
  );

  const currentStationNumberIndex = useMemo(
    () =>
      getStationNumberIndex(
        targetStation,
        firstStop ? selectedBound?.line : undefined
      ),
    [firstStop, getStationNumberIndex, selectedBound?.line, targetStation]
  );
  const nextStationNumberIndex = useMemo(
    () => getStationNumberIndex(nextStation),
    [getStationNumberIndex, nextStation]
  );

  const isJobanLineRapid = useMemo(
    () =>
      currentLine &&
      currentLine.id !== undefined &&
      currentLine.id !== null &&
      JOBAN_LINE_IDS.includes(currentLine.id) &&
      (trainType?.kind === TrainTypeKind.Rapid ||
        trainType?.kind === TrainTypeKind.CommuterRapid ||
        trainType?.kind === TrainTypeKind.HighSpeedRapid),
    [currentLine, trainType?.kind]
  );

  useEffect(() => {
    if (!selectedBound) {
      setStationNumber(undefined);
      setThreeLetterCode(undefined);
    }
  }, [selectedBound]);

  useEffect(() => {
    if (!selectedBound || !targetStation) {
      return;
    }

    if (priorCurrent && !getIsPass(targetStation)) {
      if (isJobanLineRapid) {
        const jjNumber = targetStation.stationNumbers?.find(
          (num) => num.lineSymbol === 'JJ'
        );
        if (jjNumber) {
          setStationNumber(jjNumber);
        }
      } else {
        setStationNumber(
          targetStation?.stationNumbers?.[currentStationNumberIndex]
        );
      }

      setThreeLetterCode(targetStation?.threeLetterCode ?? undefined);
      return;
    }

    // 到着していて、かつ停車駅でない場合は、次の駅の番号を表示する
    // 到着していない場合は無条件で次の駅の番号を表示する
    if ((arrived && getIsPass(currentStation)) || !arrived) {
      if (isJobanLineRapid) {
        const jjNumber = nextStation?.stationNumbers?.find(
          (num) => num.lineSymbol === 'JJ'
        );

        if (jjNumber) {
          setStationNumber(jjNumber);
        }
      } else {
        setStationNumber(nextStation?.stationNumbers?.[nextStationNumberIndex]);
      }

      setThreeLetterCode(nextStation?.threeLetterCode ?? undefined);
      return;
    }

    if (isJobanLineRapid) {
      const jjNumber = targetStation?.stationNumbers?.find(
        (num) => num.lineSymbol === 'JJ'
      );
      if (jjNumber) {
        setStationNumber(jjNumber);
      }
    } else {
      setStationNumber(
        targetStation?.stationNumbers?.[currentStationNumberIndex]
      );
    }
    setThreeLetterCode(targetStation?.threeLetterCode ?? undefined);
  }, [
    arrived,
    currentStation,
    currentStationNumberIndex,
    isJobanLineRapid,
    nextStation?.stationNumbers,
    nextStation?.threeLetterCode,
    nextStationNumberIndex,
    priorCurrent,
    selectedBound,
    targetStation,
  ]);

  return [stationNumber, threeLetterCode];
};
