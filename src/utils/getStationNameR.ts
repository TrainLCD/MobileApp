import { Station } from '../models/StationAPI';

const getStationNameR = (station: Station): string => {
  if (station.nameR.length <= 10) {
    return station.nameR;
  }
  const breaked = station.nameR.split('-').join('-\n');
  if (station.nameR.includes('mae') && !breaked.includes('-\nmae')) {
    return breaked.replace('mae', '\nmae');
  }
  return breaked;
};

export default getStationNameR;
