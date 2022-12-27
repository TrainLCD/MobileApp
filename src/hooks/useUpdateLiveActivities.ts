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
  const { arrived, approaching, selectedBound } = useRecoilValue(stationState);

  const previousStation = usePreviousStation();
  const currentStation = useCurrentStation();
  const nextStation = useNextStation();

  const activityState = useMemo(() => {
    const isPassing = getIsPass(currentStation) && arrived;
    const switchedStation = isPassing ? previousStation : currentStation;
    const passingStationName =
      (isJapanese ? currentStation?.name : currentStation?.nameR) ?? '';

    return {
      stationName: isJapanese
        ? switchedStation?.name ?? ''
        : switchedStation?.nameR ?? '',
      nextStationName: isJapanese
        ? nextStation?.name ?? ''
        : nextStation?.nameR ?? '',
      stationNumber: switchedStation?.stationNumbers[0]?.stationNumber ?? '',
      nextStationNumber: nextStation?.stationNumbers[0]?.stationNumber ?? '',
      approaching: approaching && !getIsPass(nextStation),
      stopping: arrived && !getIsPass(currentStation),
      passingStationName: isPassing ? passingStationName : '',
      passingStationNumber: isPassing
        ? currentStation?.stationNumbers[0]?.stationNumber ?? ''
        : '',
    };
  }, [approaching, arrived, currentStation, nextStation, previousStation]);

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
