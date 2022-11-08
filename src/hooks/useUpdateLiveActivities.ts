import { useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import {
  startLiveActivity,
  stopLiveActivity,
  updateLiveActivity,
} from '../utils/native/liveActivityModule';
import useCurrentStation from './useCurrentStation';
import useNextStation from './useNextStation';
import useNumbering from './useNumbering';

const useUpdateLiveActivities = (): void => {
  const { headerState } = useRecoilValue(navigationState);
  const { arrived } = useRecoilValue(stationState);

  const currentStation = useCurrentStation();
  const nextStation = useNextStation();
  const [currentNumbering] = useNumbering(true);
  const [nextNumbering] = useNumbering();

  useEffect((): (() => void) => {
    startLiveActivity();

    return () => stopLiveActivity();
  }, []);

  useEffect(() => {
    updateLiveActivity({
      stationName: isJapanese
        ? currentStation?.name ?? ''
        : currentStation?.nameR ?? '',
      nextStationName: isJapanese
        ? nextStation?.name ?? ''
        : nextStation?.nameR ?? '',
      stationNumber: currentNumbering?.stationNumber || '',
      nextStationNumber: nextNumbering?.stationNumber || '',
      runningState: headerState,
      stopping: arrived,
    });
  }, [
    arrived,
    currentNumbering?.stationNumber,
    currentStation?.name,
    currentStation?.nameR,
    headerState,
    nextNumbering?.stationNumber,
    nextStation?.name,
    nextStation?.nameR,
  ]);
};

export default useUpdateLiveActivities;
