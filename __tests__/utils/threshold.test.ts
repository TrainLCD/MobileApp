import { LineType } from '../../src/gen/stationapi_pb'
import {
  getApproachingThreshold,
  getArrivedThreshold,
} from '../../src/utils/threshold'

describe('utils/threshold.ts', () => {
  describe('getApproachingThreshold', () => {
    it.each([
      // [lineType, avgBetweenStations, expectedThreshold]
      [LineType.BULLETTRAIN, 1000, 5000],
      [LineType.BULLETTRAIN, 100, 500],
      [LineType.SUBWAY, 2000, 1500],
      [LineType.SUBWAY, 1000, 750],
      [LineType.SUBWAY, 500, 375],
      [LineType.NORMAL, 1500, 750],
      [LineType.NORMAL, 1000, 500],
      [LineType.NORMAL, 500, 250],
    ])(
      'lineType: %i, avgBetweenStations: %i, expectedApproachingThreshold: %i',
      (lineType, avgBetweenStations, expectedThreshold) => {
        const actualApproachingThreshold = getApproachingThreshold(
          lineType,
          avgBetweenStations
        )
        expect(actualApproachingThreshold).toBe(expectedThreshold)
      }
    )
  })
  describe('getArrivedThreshold', () => {
    it.each([
      // [lineType, avgBetweenStations, expectedThreshold]
      [LineType.BULLETTRAIN, 10000, 1500],
      [LineType.BULLETTRAIN, 1000, 400],
      [LineType.SUBWAY, 1500, 450],
      [LineType.SUBWAY, 1000, 300],
      [LineType.SUBWAY, 500, 150],
      [LineType.NORMAL, 1500, 300],
      [LineType.NORMAL, 1000, 200],
      [LineType.NORMAL, 500, 100],
    ])(
      'lineType: %i, avgBetweenStations: %i, expectedArrivedThreshold: %i',
      (lineType, avgBetweenStations, expectedThreshold) => {
        const actualArrivedThreshold = getArrivedThreshold(
          lineType,
          avgBetweenStations
        )
        expect(actualArrivedThreshold).toBe(expectedThreshold)
      }
    )
  })
})
