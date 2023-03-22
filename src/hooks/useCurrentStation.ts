import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';

const useCurrentStation = ({
  withTrainTypes = false,
  skipPassStation = false,
} = {}): Station | null => {
  const { station, stations, stationsWithTrainTypes } =
    useRecoilValue(stationState);

  const currentStation = useMemo(() => {
    if (!station) {
      return null;
    }
    // 通過駅を処理するためには種別が設定されている必要がある
    if (skipPassStation) {
      const switchedStations = withTrainTypes
        ? stationsWithTrainTypes
        : stations;
      const skippedCurrent = switchedStations
        .filter((s) => !getIsPass(s))
        .find((rs) => rs.groupId === station.groupId);
      return skippedCurrent ?? null;
    }

    // 種別設定がない場合は通過駅がない(skipPassStationがtrueの時点で種別が設定されている必要がある)ため、
    // そのままステートの駅を返す
    return station;
  }, [
    skipPassStation,
    station,
    stations,
    stationsWithTrainTypes,
    withTrainTypes,
  ]);

  return currentStation;
};

export default useCurrentStation;
