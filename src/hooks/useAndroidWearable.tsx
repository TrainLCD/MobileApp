import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { useRecoilValue } from 'recoil';
import locationState from '../store/atoms/location';
import stationState from '../store/atoms/station';
import sendStationInfoToWatch from '../utils/native/android/wearableModule';
import useCurrentStation from './useCurrentStation';
import useNextStation from './useNextStation';
import useNumbering from './useNumbering';

const useAndroidWearable = (): void => {
  const { arrived, approaching } = useRecoilValue(stationState);
  const { badAccuracy } = useRecoilValue(locationState);

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

  const [currentNumbering] = useNumbering();

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
        await sendStationInfoToWatch({
          stationName: station.name,
          stationNameRoman: station.nameR,
          currentStateKey: headerState.split('_')[0],
          stationNumber: currentNumbering?.stationNumber ?? '',
          badAccuracy,
        });
      } catch (err) {
        console.error(err);
      }
    })();
  }, [station, headerState, currentNumbering?.stationNumber, badAccuracy]);
};

export default useAndroidWearable;
