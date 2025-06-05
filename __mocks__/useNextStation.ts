import { Station } from "~/gen/proto/stationapi_pb"


export const useNextStation = jest.fn().mockReturnValue(null)

export const setupMockUseNextStation = (station: Station) =>
  useNextStation.mockReturnValue(station)
