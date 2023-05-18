import { Station } from '../models/StationAPI';
import getIsPass from './isPass';

const outboundCurrentStationIndex = (
  stations: Station[],
  station: Station
): number =>
  stations
    .slice()
    .reverse()
    .findIndex((s) => s?.groupId === station?.groupId);

export const getNextOutboundStopStation = (
  stations: Station[],
  actualNextStation: Station,
  station: Station,
  ignorePass = true
): Station | undefined =>
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
  stations: Station[],
  station: Station
): number => stations.findIndex((s) => s?.groupId === station?.groupId);

export const getNextInboundStopStation = (
  stations: Station[],
  actualNextStation: Station,
  station: Station,
  ignorePass = true
): Station | undefined =>
  actualNextStation && getIsPass(actualNextStation) && ignorePass
    ? stations
        .slice(
          inboundCurrentStationIndex(stations, station) - stations.length + 1
        )
        .find((s, i) => i && !getIsPass(s))
    : actualNextStation;
