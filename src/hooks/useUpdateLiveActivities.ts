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
import useNextStation from './useNextStation';
import useNumbering from './useNumbering';

const useUpdateLiveActivities = (): void => {
  const { headerState } = useRecoilValue(navigationState);
  const { station } = useRecoilValue(stationState);

  const nextStation = useNextStation();
  const [currentNumbering] = useNumbering(true);
  const [nextNumbering] = useNumbering();

  useEffect((): (() => void) => {
    startLiveActivity();

    return () => stopLiveActivity();
  }, []);

  useEffect(() => {
    updateLiveActivity({
      stationName: isJapanese ? station?.name ?? '' : station?.nameR ?? '',
      nextStationName: isJapanese
        ? nextStation?.name ?? ''
        : nextStation?.nameR ?? '',
      stationNumber: currentNumbering?.stationNumber || '',
      nextStationNumber: nextNumbering?.stationNumber || '',
      runningState: headerState,
      stopping: headerState.startsWith('CURRENT'),
    });
  }, [
    currentNumbering?.stationNumber,
    headerState,
    nextNumbering?.stationNumber,
    nextStation?.name,
    nextStation?.nameR,
    station?.name,
    station?.nameR,
  ]);
};

export default useUpdateLiveActivities;
