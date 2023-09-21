import { Station } from '../gen/stationapi_pb'
import getIsPass from './isPass'

const outboundCurrentStationIndex = (
  stations: Station.AsObject[],
  station: Station.AsObject
): number =>
  stations
    .slice()
    .reverse()
    .findIndex((s) => s?.groupId === station?.groupId)

export const getNextOutboundStopStation = (
  stations: Station.AsObject[],
  actualNextStation: Station.AsObject,
  station: Station.AsObject,
  ignorePass = true
): Station.AsObject | undefined =>
  actualNextStation && getIsPass(actualNextStation) && ignorePass
    ? stations
        .slice()
        .reverse()
        .slice(
          outboundCurrentStationIndex(stations, station) - stations.length + 1
        )
        .find((s, i) => i && !getIsPass(s))
    : actualNextStation

const inboundCurrentStationIndex = (
  stations: Station.AsObject[],
  station: Station.AsObject
): number => stations.findIndex((s) => s?.groupId === station?.groupId)

export const getNextInboundStopStation = (
  stations: Station.AsObject[],
  actualNextStation: Station.AsObject,
  station: Station.AsObject,
  ignorePass = true
): Station.AsObject | undefined =>
  actualNextStation && getIsPass(actualNextStation) && ignorePass
    ? stations
        .slice(
          inboundCurrentStationIndex(stations, station) - stations.length + 1
        )
        .find((s, i) => i && !getIsPass(s))
    : actualNextStation
