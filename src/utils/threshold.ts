import { LineType } from '../models/StationAPI';

export const getApproachingThreshold = (
  lineType: LineType,
  avgBetweenStations: number | undefined
): number => {
  const base = avgBetweenStations ? avgBetweenStations / 2 : 1000;
  if (base > 1000) {
    return 1000;
  }
  switch (lineType) {
    case LineType.BulletTrain:
      return base * 10;
    case LineType.Subway:
      return base * 1.5;
    default:
      return base;
  }
};

export const getArrivedThreshold = (
  lineType: LineType | undefined,
  avgBetweenStations: number | undefined
): number => {
  const base = avgBetweenStations ? avgBetweenStations / 6 : 300;
  if (base > 300) {
    return 300;
  }
  switch (lineType) {
    case LineType.BulletTrain:
      return base * 2;
    case LineType.Subway:
      return base * 1.5;
    default:
      return base;
  }
};
