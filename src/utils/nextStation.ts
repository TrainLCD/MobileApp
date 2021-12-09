import { Station } from '../models/StationAPI';

const outboundCurrentStationIndex = (
  stations: Station[],
  station: Station | null | undefined
): number =>
  stations
    .slice()
    .reverse()
    .findIndex((s) => s?.name === station?.name);

export const getNextOutboundStopStation = (
  stations: Station[],
  actualNextStation: Station | undefined,
  station: Station | null | undefined
): Station | undefined =>
  actualNextStation?.pass
    ? stations
        .slice()
        .reverse()
        .slice(
          outboundCurrentStationIndex(stations, station) - stations.length + 1
        )
        .find((s, i) => i && !s.pass)
    : actualNextStation;

const inboundCurrentStationIndex = (
  stations: Station[],
  station: Station | null | undefined
): number => stations.slice().findIndex((s) => s?.name === station?.name);

export const getNextInboundStopStation = (
  stations: Station[],
  actualNextStation: Station | undefined,
  station: Station | null | undefined
): Station | undefined =>
  actualNextStation?.pass
    ? stations
        .slice(
          inboundCurrentStationIndex(stations, station) - stations.length + 1
        )
        .find((s, i) => i && !s.pass)
    : actualNextStation;
