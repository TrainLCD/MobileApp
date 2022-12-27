import { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getIsPass from '../utils/isPass';
import {
  startLiveActivity,
  stopLiveActivity,
  updateLiveActivity,
} from '../utils/native/liveActivityModule';
import useCurrentStation from './useCurrentStation';
import useNextStation from './useNextStation';
import usePreviousStation from './usePreviousStation';

const useUpdateLiveActivities = (): void => {
  const [started, setStarted] = useState(false);
  const { arrived, selectedBound } = useRecoilValue(stationState);

  const previousStation = usePreviousStation();
  const currentStation = useCurrentStation();
  const stoppedCurrentStation = useCurrentStation({ skipPassStation: true });
  const nextStation = useNextStation();

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
      passingStationName: isPassing ? passingStationName : '',
      passingStationNumber: isPassing
        ? currentStation?.stationNumbers[0]?.stationNumber ?? ''
        : '',
    };
  }, [
    arrived,
    currentStation,
    nextStation,
    previousStation,
    stoppedCurrentStation,
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
