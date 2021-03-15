import { Station } from '../models/StationAPI';

const getCurrentStationIndex = (
  stations: Station[],
  nearestStation: Station
): number => stations.findIndex((s) => s.name === nearestStation?.name);

export default getCurrentStationIndex;
