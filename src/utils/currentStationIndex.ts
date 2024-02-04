import { Station } from '../../gen/proto/stationapi_pb'

const getCurrentStationIndex = (
  stations: Station[],
  nearestStation: Station | null
): number =>
  stations.findIndex(
    (s) =>
      s.name === nearestStation?.name || s.groupId === nearestStation?.groupId
  )

export default getCurrentStationIndex
