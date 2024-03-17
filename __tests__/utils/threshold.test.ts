import { LineType } from '../../gen/proto/stationapi_pb'
import {
  getApproachingThreshold,
  getArrivedThreshold,
} from '../../src/utils/threshold'

describe('utils/threshold.ts', () => {
  describe('getApproachingThreshold', () => {
    it.each([
      // [lineType, avgBetweenStations, expectedThreshold]
      [LineType.BulletTrain, 1000, 5000],
      [LineType.BulletTrain, 100, 500],
      [LineType.Subway, 2000, 1000],
      [LineType.Subway, 1000, 500],
      [LineType.Subway, 500, 250],
      [LineType.Normal, 1500, 750],
      [LineType.Normal, 1000, 500],
      [LineType.Normal, 500, 250],
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
      [LineType.BulletTrain, 10000, 1500],
      [LineType.BulletTrain, 1000, 400],
      [LineType.Subway, 1500, 300],
      [LineType.Subway, 1000, 200],
      [LineType.Subway, 500, 100],
      [LineType.Normal, 1500, 300],
      [LineType.Normal, 1000, 200],
      [LineType.Normal, 500, 100],
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
