import getStringBytes from './stringBytes';

const getStationNameScale = (stationName: string, en?: boolean): number => {
  const bytes = getStringBytes(stationName);

  if (en) {
    switch (true) {
      case bytes >= 50:
        return 0.4;
      case bytes >= 45:
        return 0.45;
      case bytes >= 30:
        return 0.55;
      case bytes >= 20:
        return 0.6;
      case bytes >= 15:
        return 0.75;
      default:
        return 1;
    }
  }

  switch (true) {
    case bytes >= 50:
      return 0.45;
    case bytes >= 45:
      return 0.6;
    case bytes >= 30:
      return 0.7;
    case bytes >= 20:
      return 0.8;
    case bytes >= 15:
      return 0.9;
    default:
      return 1;
  }
};

export default getStationNameScale;
