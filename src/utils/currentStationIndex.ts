import { Station } from '../gen/stationapi_pb'

const getCurrentStationIndex = (
  stations: Station.AsObject[],
  nearestStation: Station.AsObject | null
): number =>
  stations.findIndex(
    (s) =>
      s.name === nearestStation?.name || s.groupId === nearestStation?.groupId
  )

export default getCurrentStationIndex
