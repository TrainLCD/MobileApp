import { StationNumber } from '../../../../gen/proto/stationapi_pb'

export const useNumbering = jest.fn().mockReturnValue([undefined, undefined])

export const setupMockUseNumbering = ([stationNumber, threeLetterCode]: [
  StationNumber | undefined,
  string
]) => useNumbering.mockReturnValue([stationNumber, threeLetterCode])
