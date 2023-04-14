import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getNextStation from '../utils/getNextStation';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';

const useNextStation = (
  station?: Station,
  ignoreStopCondition = false
): Station | undefined => {
  const { leftStations } = useRecoilValue(navigationState);
  const {
    station: stationFromState,
    stations: stationsRaw,
    selectedDirection,
  } = useRecoilValue(stationState);

  const stations = useMemo(
    () => dropEitherJunctionStation(stationsRaw, selectedDirection),
    [selectedDirection, stationsRaw]
  );

  const maybeReversedStations = useMemo(
    () =>
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse(),
    [selectedDirection, stations]
  );

  const targetStation = useMemo(
    () => (station || stationFromState) ?? undefined,
    [station, stationFromState]
  );

  const targetStationArray = useMemo(
    () =>
      dropEitherJunctionStation(
        ignoreStopCondition ? maybeReversedStations : leftStations,
        selectedDirection
      ),
    [
      ignoreStopCondition,
      leftStations,
      maybeReversedStations,
      selectedDirection,
    ]
  );

  const actualNextStation = useMemo(
    () =>
      (targetStation && getNextStation(targetStationArray, targetStation)) ??
      undefined,
    [targetStationArray, targetStation]
  );

  const nextInboundStopStation = useMemo(
    () =>
      ignoreStopCondition
        ? actualNextStation
        : actualNextStation &&
          targetStation &&
          getNextInboundStopStation(
            targetStationArray,
            actualNextStation,
            targetStation
          ),
    [actualNextStation, targetStation, targetStationArray, ignoreStopCondition]
  );
  const nextOutboundStopStation = useMemo(
    () =>
      ignoreStopCondition
        ? actualNextStation
        : actualNextStation &&
          targetStation &&
          getNextOutboundStopStation(
            targetStationArray,
            actualNextStation,
            targetStation
          ),
    [actualNextStation, targetStation, targetStationArray, ignoreStopCondition]
  );

  const nextStation = useMemo(
    () =>
      selectedDirection === 'INBOUND'
        ? nextInboundStopStation
        : nextOutboundStopStation,
    [nextInboundStopStation, nextOutboundStopStation, selectedDirection]
  );

  return nextStation;
};

export default useNextStation;
