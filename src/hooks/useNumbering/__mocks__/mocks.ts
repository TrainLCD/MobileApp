import { StationNumber } from '../../../gen/stationapi_pb'

export const useNumbering = jest.fn().mockReturnValue([undefined, undefined])

export const setupMockUseNumbering = ([stationNumber, threeLetterCode]: [
  StationNumber.AsObject | undefined,
  string
]) => useNumbering.mockReturnValue([stationNumber, threeLetterCode])
