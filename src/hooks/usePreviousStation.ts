import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';

const usePreviousStation = (withTrainTypes?: boolean): Station | undefined => {
  const { station, stations, stationsWithTrainTypes } =
    useRecoilValue(stationState);
  const switchedStations = useMemo(
    () =>
      (withTrainTypes ? stationsWithTrainTypes : stations).filter(
        (s) => !getIsPass(s)
      ),
    [stations, stationsWithTrainTypes, withTrainTypes]
  );

  const currentStationIndex = switchedStations.findIndex(
    (rs) => rs.groupId === station?.groupId
  );
  return switchedStations[currentStationIndex - 1] ?? switchedStations[0];
};

export default usePreviousStation;
