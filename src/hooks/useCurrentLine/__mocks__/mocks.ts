import { Line } from '../../../gen/stationapi_pb'

export const useCurrentLine = jest.fn().mockReturnValue(null)

export const setupMockUseCurrentLine = (line: Line.AsObject) =>
  useCurrentLine.mockReturnValue(line)
