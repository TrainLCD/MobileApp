import { StationResponse } from '../gen/stationapi_pb'

const getStationNameR = (station: StationResponse.AsObject): string => {
  if (station.nameRoman?.length <= 10) {
    return station.nameRoman
  }
  const breaked = station.nameRoman?.split('-').join('-\n')
  if (station.nameRoman?.includes('mae') && !breaked.includes('-\nmae')) {
    return breaked.replace('mae', '\nmae')
  }
  return breaked
}

export default getStationNameR
