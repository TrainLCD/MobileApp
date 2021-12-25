import { LineType } from '../models/StationAPI';

const getMaxThreshold = (baseThreshold: number, lineType: LineType): number => {
  switch (lineType) {
    case LineType.BulletTrain:
      return baseThreshold * 10;
    case LineType.Subway:
      return baseThreshold * 1.5;
    default:
      return baseThreshold;
  }
};

export const getApproachingThreshold = (
  lineType: LineType | undefined,
  avgBetweenStations: number | undefined
): number => {
  const maxThreshold = getMaxThreshold(1000, lineType || LineType.Normal);
  const base = avgBetweenStations ? avgBetweenStations / 2 : 1000;
  if (base > maxThreshold) {
    return maxThreshold;
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
  const maxThreshold = getMaxThreshold(300, lineType || LineType.Normal);
  const base = avgBetweenStations ? avgBetweenStations / 6 : 300;
  if (base > maxThreshold) {
    return maxThreshold;
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
