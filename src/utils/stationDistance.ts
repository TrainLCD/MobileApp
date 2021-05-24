import * as geolib from 'geolib';
import { Station } from '../models/StationAPI';

const calcStationDistances = (
  stations: Station[],
  latitude: number,
  longitude: number
): Station[] => {
  const scored = stations.map((station) => {
    const distance = geolib.getDistance(
      { latitude, longitude },
      { latitude: station.latitude, longitude: station.longitude }
    );
    return { ...station, distance };
  });
  scored.sort((a, b) => {
    if (a.distance < b.distance) {
      return -1;
    }
    if (a.distance > b.distance) {
      return 1;
    }
    return 0;
  });
  return scored;
};

export default calcStationDistances;
