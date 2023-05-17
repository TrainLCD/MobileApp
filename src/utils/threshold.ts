import { LineType } from '../gen/stationapi_pb';

const getMaxThreshold = (
  baseThreshold: number,
  lineType: LineType,
  operationType: 'APPROACHING' | 'ARRIVING'
): number => {
  switch (lineType) {
    case LineType.BULLETTRAIN:
      return operationType === 'ARRIVING'
        ? baseThreshold * 5
        : baseThreshold * 10;
    case LineType.SUBWAY:
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
    lineType || LineType.NORMAL,
    'APPROACHING'
  );
  const base = avgBetweenStations ? avgBetweenStations / 2 : 1000;
  if (base > maxThreshold) {
    return maxThreshold;
  }
  switch (lineType) {
    case LineType.BULLETTRAIN:
      return base * 10;
    case LineType.SUBWAY:
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
    lineType || LineType.NORMAL,
    'ARRIVING'
  );
  const base = avgBetweenStations ? avgBetweenStations / 6 : 300;
  if (base > maxThreshold) {
    return maxThreshold;
  }
  switch (lineType) {
    case LineType.BULLETTRAIN:
      return base * 2;
    case LineType.SUBWAY:
      return base * 1.5;
    default:
      return base;
  }
};
