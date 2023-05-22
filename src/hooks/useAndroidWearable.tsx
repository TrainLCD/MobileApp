import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { useRecoilValue } from 'recoil';
import locationState from '../store/atoms/location';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import sendStationInfoToWatch from '../utils/native/android/wearableModule';
import useCurrentStation from './useCurrentStation';
import useNextStation from './useNextStation';
import useNumbering from './useNumbering';

const useAndroidWearable = (): void => {
  const { arrived, approaching } = useRecoilValue(stationState);
  const { badAccuracy } = useRecoilValue(locationState);

  const currentStation = useCurrentStation();
  const actualNextStation = useNextStation(false);
  const nextStation = useNextStation();

  const headerState = useMemo(() => {
    if (arrived && currentStation && !getIsPass(currentStation)) {
      return 'CURRENT';
    }
    // 次に通る駅が通過駅である場合、通過駅に対して「まもなく」と表示されないようにする
    if (approaching && actualNextStation && !getIsPass(actualNextStation)) {
      return 'ARRIVING';
    }
    return 'NEXT';
  }, [actualNextStation, approaching, arrived, currentStation]);

  const [currentNumbering] = useNumbering();

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
