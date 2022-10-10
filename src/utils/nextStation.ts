import { Station } from '../models/StationAPI';
import getIsPass from './isPass';

const outboundCurrentStationIndex = (
  stations: Station[],
  station: Station | null | undefined
): number =>
  stations
    .slice()
    .reverse()
    .findIndex((s) => s?.groupId === station?.groupId);

export const getNextOutboundStopStation = (
  stations: Station[],
  actualNextStation: Station | undefined,
  station: Station | null | undefined
): Station | undefined =>
  getIsPass(actualNextStation)
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
  station: Station | null | undefined
): number => stations.slice().findIndex((s) => s?.groupId === station?.groupId);

export const getNextInboundStopStation = (
  stations: Station[],
  actualNextStation: Station | undefined,
  station: Station | null | undefined
): Station | undefined =>
  getIsPass(actualNextStation)
    ? stations
        .slice(
          inboundCurrentStationIndex(stations, station) - stations.length + 1
        )
        .find((s, i) => i && !getIsPass(s))
    : actualNextStation;
