const getStationNameScale = (stationName: string, en?: boolean): number => {
  if (en) {
    if (stationName.length >= 25) {
      return 0.65;
    }
    if (stationName.length >= 20) {
      return 0.7;
    }
    if (stationName.length >= 15) {
      return 0.8;
    }
    return 1;
  }
  if (stationName.length >= 25) {
    return 0.45;
  }
  if (stationName.length >= 20) {
    return 0.5;
  }
  if (stationName.length >= 15) {
    return 0.6;
  }
  if (stationName.length >= 10) {
    return 0.7;
  }
  return 1;
};

export default getStationNameScale;
