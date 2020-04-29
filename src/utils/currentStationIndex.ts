import { Station } from '../models/StationAPI';

const getCurrentStationIndex = (
  stations: Station[],
  nearestStation: Station
): number => stations.findIndex((s) => s.groupId === nearestStation.groupId);

export default getCurrentStationIndex;
