const getStationNameScaleStopping = (
  stationName: string,
  en?: boolean
): number => {
  if (en) {
    if (stationName.length > 20) {
      return 0.5;
    }
    if (stationName.length > 15) {
      return 0.75;
    }
    return 1;
  }
  if (stationName.length > 15) {
    return 0.45;
  }
  if (stationName.length > 10) {
    return 0.5;
  }
  if (stationName.length > 5) {
    return 0.75;
  }
  return 1;
};

export default getStationNameScaleStopping;
