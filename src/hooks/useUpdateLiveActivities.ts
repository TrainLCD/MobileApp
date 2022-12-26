import { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
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

  const { trainType } = useRecoilValue(navigationState);
  const { arrived, approaching, selectedBound } = useRecoilValue(stationState);

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
      approaching: approaching && !getIsPass(nextStation),
      stopping: arrived && !getIsPass(currentStation),
      lineName: isJapanese
        ? (currentStation?.currentLine?.name ?? '').replace(
            parenthesisRegexp,
            ''
          )
        : (currentStation?.currentLine?.nameR ?? '').replace(
            parenthesisRegexp,
            ''
          ),
      boundStationName: isJapanese
        ? selectedBound?.name ?? ''
        : selectedBound?.nameR ?? '',
      boundStationNumber: selectedBound?.stationNumbers[0]?.stationNumber ?? '',
      trainTypeName: isJapanese
        ? (trainType?.name ?? '各駅停車').replace(parenthesisRegexp, '')
        : (trainType?.nameR ?? 'Local').replace(parenthesisRegexp, ''),
    }),
    [
      approaching,
      arrived,
      currentNumbering?.stationNumber,
      currentStation,
      nextNumbering?.stationNumber,
      nextStation,
      selectedBound?.name,
      selectedBound?.nameR,
      selectedBound?.stationNumbers,
      trainType?.name,
      trainType?.nameR,
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
