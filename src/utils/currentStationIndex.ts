import { StationResponse } from '../gen/stationapi_pb'

const getCurrentStationIndex = (
  stations: StationResponse.AsObject[],
  nearestStation: StationResponse.AsObject | null
): number =>
  stations.findIndex(
    (s) =>
      s.name === nearestStation?.name || s.groupId === nearestStation?.groupId
  )

export default getCurrentStationIndex
