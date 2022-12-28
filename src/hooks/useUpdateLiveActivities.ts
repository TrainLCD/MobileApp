import { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import { directionToDirectionName } from '../models/Bound';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getIsPass from '../utils/isPass';
import { getIsLoopLine, isMeijoLine } from '../utils/loopLine';
import {
  startLiveActivity,
  stopLiveActivity,
  updateLiveActivity,
} from '../utils/native/liveActivityModule';
import useCurrentLine from './useCurrentLine';
import useCurrentStation from './useCurrentStation';
import useLoopLineBoundText from './useLoopLineBoundText';
import useNextStation from './useNextStation';
import usePreviousStation from './usePreviousStation';

const useUpdateLiveActivities = (): void => {
  const [started, setStarted] = useState(false);
  const { arrived, selectedBound, selectedDirection } =
    useRecoilValue(stationState);
  const { trainType } = useRecoilValue(navigationState);

  const previousStation = usePreviousStation();
  const currentStation = useCurrentStation();
  const stoppedCurrentStation = useCurrentStation({ skipPassStation: true });
  const nextStation = useNextStation();
  const loopLineBoundText = useLoopLineBoundText(false);
  const currentLine = useCurrentLine();

  const isLoopLine = useMemo(
    () => getIsLoopLine(currentStation?.currentLine, trainType),
    [currentStation?.currentLine, trainType]
  );

  const trainTypeName = useMemo(() => {
    if (selectedDirection && isLoopLine) {
      return directionToDirectionName(
        currentStation?.currentLine,
        selectedDirection
      );
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
    currentStation?.currentLine,
    isLoopLine,
    selectedDirection,
    trainType?.name,
    trainType?.nameR,
  ]);

  const boundStationName = useMemo(() => {
    if (isLoopLine) {
      return loopLineBoundText;
    }
    if (isJapanese) {
      return selectedBound?.name ?? '';
    }
    return selectedBound?.nameR ?? '';
  }, [
    isLoopLine,
    loopLineBoundText,
    selectedBound?.name,
    selectedBound?.nameR,
  ]);

  const currentLineIsMeijo = useMemo(
    () => currentLine && isMeijoLine(currentLine.id),
    [currentLine]
  );

  const activityState = useMemo(() => {
    const isPassing = getIsPass(currentStation) && arrived;

    const stoppedStation = stoppedCurrentStation ?? previousStation;
    const passingStationName =
      (isJapanese ? currentStation?.name : currentStation?.nameR) ?? '';

    return {
      stationName: isJapanese
        ? stoppedStation?.name ?? ''
        : stoppedStation?.nameR ?? '',
      nextStationName: isJapanese
        ? nextStation?.name ?? ''
        : nextStation?.nameR ?? '',
      stationNumber: stoppedStation?.stationNumbers[0]?.stationNumber ?? '',
      nextStationNumber: nextStation?.stationNumbers[0]?.stationNumber ?? '',
      approaching: false, // どうにか表示できるようにする
      stopping: arrived && !getIsPass(currentStation),
      boundStationName: currentLineIsMeijo ? '' : boundStationName,
      boundStationNumber: currentLineIsMeijo
        ? ''
        : selectedBound?.stationNumbers[0]?.stationNumber ?? '',
      trainTypeName,
      passingStationName: isPassing ? passingStationName : '',
      passingStationNumber: isPassing
        ? currentStation?.stationNumbers[0]?.stationNumber ?? ''
        : '',
      isLoopLine,
    };
  }, [
    arrived,
    boundStationName,
    currentLineIsMeijo,
    currentStation,
    isLoopLine,
    nextStation?.name,
    nextStation?.nameR,
    nextStation?.stationNumbers,
    previousStation,
    selectedBound?.stationNumbers,
    stoppedCurrentStation,
    trainTypeName,
  ]);

  useEffect(() => {
    if (selectedBound && !started) {
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
