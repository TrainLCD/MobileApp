import { TrainingStationFixture } from './fixture/station'

export const useNextStation = jest.fn().mockReturnValue(null)

export const setupMockUseNextStation = (station: TrainingStationFixture) =>
  useNextStation.mockReturnValue(station)
