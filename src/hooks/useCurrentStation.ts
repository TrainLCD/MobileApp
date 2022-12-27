import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';

const useCurrentStation = ({
  withTrainTypes = false,
  skipPassStation = false,
} = {}): Station | undefined => {
  const { station, stations, stationsWithTrainTypes } =
    useRecoilValue(stationState);
  const switchedStations = useMemo(
    () => (withTrainTypes ? stationsWithTrainTypes : stations),
    [stations, stationsWithTrainTypes, withTrainTypes]
  );

  return switchedStations
    .filter((s) => (skipPassStation ? !getIsPass(s) : s))
    .find((rs) => rs.groupId === station?.groupId);
};

export default useCurrentStation;
