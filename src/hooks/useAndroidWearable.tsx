import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { useRecoilValue } from 'recoil';
import stationState from '../store/atoms/station';
import sendStationInfoToWatch from '../utils/native/android/wearableModule';
import useCurrentStation from './useCurrentStation';
import useNextStation from './useNextStation';

const useAndroidWearable = (): void => {
  const { arrived, approaching } = useRecoilValue(stationState);

  const headerState = useMemo(() => {
    if (arrived) {
      return 'CURRENT';
    }
    if (approaching) {
      return 'ARRIVING';
    }
    return 'NEXT';
  }, [approaching, arrived]);

  const currentStation = useCurrentStation();
  const nextStation = useNextStation();

  const station = useMemo(
    () => (headerState === 'CURRENT' ? currentStation : nextStation),
    [currentStation, nextStation, headerState]
  );

  useEffect(() => {
    (async () => {
      if (!station || Platform.OS !== 'android') {
        return;
      }
      try {
        await sendStationInfoToWatch(headerState, station);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [station, headerState]);
};

export default useAndroidWearable;
