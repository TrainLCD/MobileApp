import { useEffect } from 'react';
import { useRecoilValue } from 'recoil';
import useNextStation from '../components/useNextStation';
import {
  startLiveActivity,
  stopLiveActivity,
  updateLiveActivity,
} from '../nativeUtils/liveActivityModule';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';

const useLiveActivities = (): void => {
  const { headerState } = useRecoilValue(navigationState);
  const { station } = useRecoilValue(stationState);

  const nextStation = useNextStation();

  useEffect((): (() => void) => {
    const initialState = {
      stationName: station?.name ?? '',
      nextStationName: nextStation?.name ?? '',
      stationNumber: station?.stationNumbers?.[0]?.stationNumber ?? '',
      nextStationNumber: nextStation?.stationNumbers?.[0]?.stationNumber ?? '',
      runningState: headerState,
      stopping: headerState.startsWith('CURRENT'),
    };
    startLiveActivity(initialState);

    return () => stopLiveActivity(initialState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateLiveActivity({
      stationName: station?.name ?? '',
      nextStationName: nextStation?.name ?? '',
      stationNumber: station?.stationNumbers?.[0]?.stationNumber ?? '',
      nextStationNumber: nextStation?.stationNumbers?.[0]?.stationNumber ?? '',
      runningState: headerState,
      stopping: headerState.startsWith('CURRENT'),
    });
  }, [
    headerState,
    nextStation?.name,
    nextStation?.stationNumbers,
    station?.name,
    station?.stationNumbers,
  ]);
};

export default useLiveActivities;
