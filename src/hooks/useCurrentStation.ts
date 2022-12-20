import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import stationState from '../store/atoms/station';

const useCurrentStation = (withTrainTypes?: boolean): Station | undefined => {
  const { station, stations, stationsWithTrainTypes } =
    useRecoilValue(stationState);
  const switchedStations = useMemo(
    () => (withTrainTypes ? stationsWithTrainTypes : stations),
    [stations, stationsWithTrainTypes, withTrainTypes]
  );

  return switchedStations.find((rs) => rs.groupId === station?.groupId);
};

export default useCurrentStation;
