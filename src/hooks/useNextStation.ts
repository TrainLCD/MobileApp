import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getNextStation from '../utils/getNextStation';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../utils/nextStation';
import useCurrentStation from './useCurrentStation';

const useNextStation = (
  station?: Station,
  ignoreStopCondition = false
): Station | undefined => {
  const { stations: stationsRaw, selectedDirection } =
    useRecoilValue(stationState);

  const stationFromHook = useCurrentStation({ skipPassStation: true });
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
    () => (station || stationFromHook) ?? undefined,
    [station, stationFromHook]
  );

  const targetStationArray = useMemo(
    () =>
      dropEitherJunctionStation(
        ignoreStopCondition ? maybeReversedStations : stations,
        selectedDirection
      ),
    [ignoreStopCondition, maybeReversedStations, selectedDirection, stations]
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
