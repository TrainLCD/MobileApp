import { LineType, LINE_TYPE } from '../models/StationAPI';

const getMaxThreshold = (
  baseThreshold: number,
  lineType: LineType,
  operationType: 'APPROACHING' | 'ARRIVING'
): number => {
  switch (lineType) {
    case LINE_TYPE.BULLET_TRAIN:
      return operationType === 'ARRIVING'
        ? baseThreshold * 5
        : baseThreshold * 10;
    case LINE_TYPE.SUBWAY:
      return baseThreshold * 1.5;
    default:
      return baseThreshold;
  }
};

export const getApproachingThreshold = (
  lineType: LineType | undefined,
  avgBetweenStations: number | undefined
): number => {
  const maxThreshold = getMaxThreshold(
    1000,
    lineType || LINE_TYPE.NORMAL,
    'APPROACHING'
  );
  const base = avgBetweenStations ? avgBetweenStations / 2 : 1000;
  if (base > maxThreshold) {
    return maxThreshold;
  }
  switch (lineType) {
    case LINE_TYPE.BULLET_TRAIN:
      return base * 10;
    case LINE_TYPE.SUBWAY:
      return base * 1.5;
    default:
      return base;
  }
};

export const getArrivedThreshold = (
  lineType: LineType | undefined,
  avgBetweenStations: number | undefined
): number => {
  const maxThreshold = getMaxThreshold(
    300,
    lineType || LINE_TYPE.NORMAL,
    'ARRIVING'
  );
  const base = avgBetweenStations ? avgBetweenStations / 6 : 300;
  if (base > maxThreshold) {
    return maxThreshold;
  }
  switch (lineType) {
    case LINE_TYPE.BULLET_TRAIN:
      return base * 2;
    case LINE_TYPE.SUBWAY:
      return base * 1.5;
    default:
      return base;
  }
};
