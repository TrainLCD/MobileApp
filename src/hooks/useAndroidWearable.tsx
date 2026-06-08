import { useAtomValue } from 'jotai';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import sendStationInfoToWatch from '../utils/native/android/wearableModule';
import { useBadAccuracy } from './useBadAccuracy';
import { useCurrentStation } from './useCurrentStation';
import { useIsNextLastStop } from './useIsNextLastStop';
import { useNextStation } from './useNextStation';
import { useNumbering } from './useNumbering';
import { useStoppingState } from './useStoppingState';

export const useAndroidWearable = (): void => {
  const { arrived } = useAtomValue(stationState);
  const currentStation = useCurrentStation();

  const nextStation = useNextStation();
  const stoppingState = useStoppingState();
  const [currentNumbering] = useNumbering();
  const isNextLastStop = useIsNextLastStop();
  const badAccuracy = useBadAccuracy();

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
          stationName: station.name ?? '',
          stationNameRoman: station.nameRoman ?? '',
          currentStateKey: stoppingState ?? 'CURRENT',
          stationNumber: currentNumbering?.stationNumber ?? '',
          badAccuracy,
          isNextLastStop,
        });
      } catch (e) {
        console.warn('Failed to send station info to watch:', e);
      }
    })();
  }, [
    badAccuracy,
    currentNumbering?.stationNumber,
    isNextLastStop,
    station,
    stoppingState,
  ]);
};
