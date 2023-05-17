import { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import { directionToDirectionName } from '../models/Bound';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import {
  getIsLoopLine,
  isMeijoLine,
  isOsakaLoopLine,
  isYamanoteLine,
} from '../utils/loopLine';
import {
  startLiveActivity,
  stopLiveActivity,
  updateLiveActivity,
} from '../utils/native/liveActivityModule';
import useCurrentLine from './useCurrentLine';
import useCurrentStation from './useCurrentStation';
import useIsNextLastStop from './useIsNextLastStop';
import useLoopLineBound from './useLoopLineBound';
import useNextStation from './useNextStation';
import usePreviousStation from './usePreviousStation';
import useStationNumberIndexFunc from './useStationNumberIndexFunc';

const useUpdateLiveActivities = (): void => {
  const [started, setStarted] = useState(false);
  const { station, arrived, selectedBound, selectedDirection, approaching } =
    useRecoilValue(stationState);
  const { trainType, leftStations } = useRecoilValue(navigationState);

  const previousStation = usePreviousStation();
  const currentStation = useCurrentStation();
  const stoppedCurrentStation = useCurrentStation({ skipPassStation: true });
  const nextStation = useNextStation();
  const loopLineBound = useLoopLineBound(false);
  const currentLine = useCurrentLine();
  const isNextLastStop = useIsNextLastStop();
  const getStationNumberIndex = useStationNumberIndexFunc();

  const isLoopLine = useMemo(
    () => getIsLoopLine(currentStation?.line, trainType),
    [currentStation?.line, trainType]
  );

  const trainTypeName = useMemo(() => {
    // 山手線か大阪環状線の直通がない種別が選択されていて、日本語環境でもない場合
    // 英語だとInbound/Outboundとなり本質と違うので空の文字列を渡して表示しないようにしている
    // 名古屋市営地下鉄名城線は主要行き先を登録していないので、Clockwise/Counterclockwiseのままにしている
    if (
      currentLine &&
      (isYamanoteLine(currentLine.id) || isOsakaLoopLine(currentLine.id)) &&
      !trainType &&
      !isJapanese
    ) {
      return '';
    }
    if (selectedDirection && isLoopLine) {
      return directionToDirectionName(currentStation?.line, selectedDirection);
    }
    if (isJapanese) {
      return (trainType?.name ?? '各駅停車')
        .replace(parenthesisRegexp, '')
        .replace(/\n/, '');
    }
    return (trainType?.nameR ?? 'Local')
      .replace(parenthesisRegexp, '')
      .replace(/\n/, '');
  }, [
    currentLine,
    currentStation?.line,
    isLoopLine,
    selectedDirection,
    trainType,
  ]);

  const boundStationName = useMemo(() => {
    if (isLoopLine) {
      return loopLineBound?.boundFor;
    }
    if (isJapanese) {
      return selectedBound?.name ?? '';
    }
    return selectedBound?.nameRoman ?? '';
  }, [
    isLoopLine,
    loopLineBound?.boundFor,
    selectedBound?.name,
    selectedBound?.nameRoman,
  ]);

  const currentLineIsMeijo = useMemo(
    () => currentLine && isMeijoLine(currentLine.id),
    [currentLine]
  );

  const actualNextStation = useMemo(
    () => station && getNextStation(leftStations, station),
    [leftStations, station]
  );

  const boundStationNumber = useMemo(() => {
    if (currentLineIsMeijo) {
      return '';
    }

    if (isLoopLine) {
      return loopLineBound?.stations
        .map((s) => {
          const stationIndex = getStationNumberIndex(
            s?.stationNumbersList ?? []
          );
          return s?.stationNumbersList[stationIndex]?.stationNumber;
        })
        .join('/');
    }
    const boundStationIndex = getStationNumberIndex(
      selectedBound?.stationNumbersList ?? []
    );
    return (
      selectedBound?.stationNumbersList[boundStationIndex]?.stationNumber ?? ''
    );
  }, [
    currentLineIsMeijo,
    getStationNumberIndex,
    isLoopLine,
    loopLineBound?.stations,
    selectedBound?.stationNumbersList,
  ]);

  const activityState = useMemo(() => {
    const isPassing = currentStation && getIsPass(currentStation) && arrived;

    const stoppedStation = stoppedCurrentStation ?? previousStation;
    const passingStationName =
      (isJapanese ? currentStation?.name : currentStation?.nameRoman) ?? '';

    const stoppedStationNumberingIndex = getStationNumberIndex(
      stoppedStation?.stationNumbersList ?? []
    );
    const currentStationNumberingIndex = getStationNumberIndex(
      currentStation?.stationNumbersList ?? []
    );
    const nextStationNumberingIndex = getStationNumberIndex(
      nextStation?.stationNumbersList ?? []
    );

    return {
      stationName: isJapanese
        ? stoppedStation?.name ?? ''
        : stoppedStation?.nameR ?? '',
      nextStationName: isJapanese
        ? nextStation?.name ?? ''
        : nextStation?.nameR ?? '',
      stationNumber:
        stoppedStation?.stationNumbers?.[stoppedStationNumberingIndex]
          ?.stationNumber ?? '',
      nextStationNumber:
        nextStation?.stationNumbers?.[nextStationNumberingIndex]
          ?.stationNumber ?? '',
      approaching: !!(
        approaching &&
        !arrived &&
        actualNextStation &&
        !getIsPass(actualNextStation)
      ),
      stopping: !!(arrived && currentStation && !getIsPass(currentStation)),
      boundStationName: currentLineIsMeijo ? '' : boundStationName,
      boundStationNumber,
      trainTypeName,
      passingStationName: isPassing ? passingStationName : '',
      passingStationNumber: isPassing
        ? currentStation?.stationNumbersList[currentStationNumberingIndex]
            ?.stationNumber ?? ''
        : '',
      isLoopLine,
      isNextLastStop,
    };
  }, [
    actualNextStation,
    approaching,
    arrived,
    boundStationName,
    boundStationNumber,
    currentLineIsMeijo,
    currentStation,
    getStationNumberIndex,
    isLoopLine,
    isNextLastStop,
    nextStation?.name,
    nextStation?.nameR,
    nextStation?.stationNumbers,
    nextStation?.stationNumbersList,
    previousStation,
    stoppedCurrentStation,
    trainTypeName,
  ]);

  useEffect(() => {
    if (selectedBound && !started && activityState) {
      startLiveActivity(activityState);
      setStarted(true);
    }
  }, [activityState, selectedBound, started]);

  useEffect(() => {
    if (!selectedBound) {
      stopLiveActivity();
      setStarted(false);
    }
  }, [selectedBound]);

  useEffect(() => {
    updateLiveActivity(activityState);
  }, [activityState]);
};

export default useUpdateLiveActivities;
