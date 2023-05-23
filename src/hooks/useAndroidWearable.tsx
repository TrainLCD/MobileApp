import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { useRecoilValue } from 'recoil';
import locationState from '../store/atoms/location';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import sendStationInfoToWatch from '../utils/native/android/wearableModule';
import useCurrentStateKey from './useCurrentStateKey';
import useCurrentStation from './useCurrentStation';
import useIsNextLastStop from './useIsNextLastStop';
import useNextStation from './useNextStation';
import useNumbering from './useNumbering';

const useAndroidWearable = (): void => {
  const { arrived } = useRecoilValue(stationState);
  const { badAccuracy } = useRecoilValue(locationState);

  const currentStation = useCurrentStation();
  const nextStation = useNextStation();
  const currentStateKey = useCurrentStateKey();
  const [currentNumbering] = useNumbering();
  const isNextLastStop = useIsNextLastStop();

  const station = useMemo(
    () =>
      arrived && currentStation && !getIsPass(currentStation)
        ? currentStation
        : nextStation,
    [arrived, currentStation, nextStation]
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
          currentStateKey,
          stationNumber: currentNumbering?.stationNumber ?? '',
          badAccuracy,
          isNextLastStop,
        });
      } catch (err) {
        console.error(err);
      }
    })();
  }, [
    station,
    currentStateKey,
    currentNumbering?.stationNumber,
    badAccuracy,
    isNextLastStop,
  ]);
};

export default useAndroidWearable;
