import { StationResponse } from '../gen/stationapi_pb';
import getIsPass from './isPass';

const outboundCurrentStationIndex = (
  stations: StationResponse.AsObject[],
  station: StationResponse.AsObject
): number =>
  stations
    .slice()
    .reverse()
    .findIndex((s) => s?.groupId === station?.groupId);

export const getNextOutboundStopStation = (
  stations: StationResponse.AsObject[],
  actualNextStation: StationResponse.AsObject,
  station: StationResponse.AsObject,
  ignorePass = true
): StationResponse.AsObject | undefined =>
  actualNextStation && getIsPass(actualNextStation) && ignorePass
    ? stations
        .slice()
        .reverse()
        .slice(
          outboundCurrentStationIndex(stations, station) - stations.length + 1
        )
        .find((s, i) => i && !getIsPass(s))
    : actualNextStation;

const inboundCurrentStationIndex = (
  stations: StationResponse.AsObject[],
  station: StationResponse.AsObject
): number => stations.findIndex((s) => s?.groupId === station?.groupId);

export const getNextInboundStopStation = (
  stations: StationResponse.AsObject[],
  actualNextStation: StationResponse.AsObject,
  station: StationResponse.AsObject,
  ignorePass = true
): StationResponse.AsObject | undefined =>
  actualNextStation && getIsPass(actualNextStation) && ignorePass
    ? stations
        .slice(
          inboundCurrentStationIndex(stations, station) - stations.length + 1
        )
        .find((s, i) => i && !getIsPass(s))
    : actualNextStation;
