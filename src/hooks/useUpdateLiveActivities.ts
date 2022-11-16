import { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import navigationState from '../store/atoms/navigation';
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
import useNumbering from './useNumbering';

const useUpdateLiveActivities = (): void => {
  const [started, setStarted] = useState(false);

  const { headerState } = useRecoilValue(navigationState);
  const { arrived, selectedBound } = useRecoilValue(stationState);

  const currentStation = useCurrentStation();
  const nextStation = useNextStation();
  const [currentNumbering] = useNumbering(true);
  const [nextNumbering] = useNumbering();

  const activityState = useMemo(
    () => ({
      stationName: isJapanese
        ? currentStation?.name ?? ''
        : currentStation?.nameR ?? '',
      nextStationName: isJapanese
        ? nextStation?.name ?? ''
        : nextStation?.nameR ?? '',
      stationNumber: currentNumbering?.stationNumber || '',
      nextStationNumber: nextNumbering?.stationNumber || '',
      runningState: headerState,
      stopping: arrived && !getIsPass(currentStation),
    }),
    [
      arrived,
      currentNumbering?.stationNumber,
      currentStation,
      headerState,
      nextNumbering?.stationNumber,
      nextStation?.name,
      nextStation?.nameR,
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
    if (getIsPass(currentStation)) {
      return;
    }
    updateLiveActivity(activityState);
  }, [activityState, currentStation]);
};

export default useUpdateLiveActivities;
