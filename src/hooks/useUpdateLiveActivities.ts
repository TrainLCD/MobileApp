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
  const { arrived, approaching, selectedBound, station } =
    useRecoilValue(stationState);

  const previousStation = usePreviousStation();
  const currentStation = useCurrentStation();
  const nextStation = useNextStation();

  const passingStation = useMemo(
    () => (arrived && getIsPass(station) ? station : null),
    [arrived, station]
  );

  const activityState = useMemo(
    () => ({
      stationName: isJapanese
        ? currentStation?.name ?? ''
        : currentStation?.nameR ?? '',
      nextStationName: isJapanese
        ? nextStation?.name ?? ''
        : nextStation?.nameR ?? '',
      stationNumber: currentStation?.stationNumbers[0]?.stationNumber ?? '',
      nextStationNumber: nextStation?.stationNumbers[0]?.stationNumber ?? '',
      approaching: approaching && !getIsPass(nextStation),
      stopping: arrived && !getIsPass(currentStation),
      passingStationName: '',
      passingStationNumber: '',
    }),
    [approaching, arrived, currentStation, nextStation]
  );

  const activityPassingState = useMemo(
    () => ({
      stationName: isJapanese
        ? previousStation?.name ?? ''
        : previousStation?.nameR ?? '',
      nextStationName: isJapanese
        ? nextStation?.name ?? ''
        : nextStation?.nameR ?? '',
      stationNumber: previousStation?.stationNumbers[0]?.stationNumber ?? '',
      nextStationNumber: nextStation?.stationNumbers[0]?.stationNumber ?? '',
      approaching: false,
      stopping: false,
      passingStationName: isJapanese
        ? currentStation?.name ?? ''
        : currentStation?.nameR ?? '',
      passingStationNumber:
        currentStation?.stationNumbers[0]?.stationNumber ?? '',
    }),
    [
      currentStation?.name,
      currentStation?.nameR,
      currentStation?.stationNumbers,
      nextStation?.name,
      nextStation?.nameR,
      nextStation?.stationNumbers,
      previousStation?.name,
      previousStation?.nameR,
      previousStation?.stationNumbers,
    ]
  );

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
    if (passingStation && arrived) {
      updateLiveActivity(activityPassingState);
      return;
    }

    if (getIsPass(currentStation)) {
      return;
    }
    updateLiveActivity(activityState);
  }, [
    activityPassingState,
    activityState,
    arrived,
    currentStation,
    passingStation,
  ]);
};

export default useUpdateLiveActivities;
