import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import stationState from '../store/atoms/station';

const useCurrentStation = (withTrainTypes?: boolean): Station | undefined => {
  const { station, rawStations, stationsWithTrainTypes } =
    useRecoilValue(stationState);
  const stations = useMemo(
    () => (withTrainTypes ? stationsWithTrainTypes : rawStations),
    [rawStations, stationsWithTrainTypes, withTrainTypes]
  );

  return stations.find((rs) => rs.groupId === station?.groupId);
};

export default useCurrentStation;
