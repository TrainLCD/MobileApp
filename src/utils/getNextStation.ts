import { Station } from '../models/StationAPI';

const getNextStation = (
  stations: Station[],
  station: Station
): Station | undefined => {
  const index = stations.findIndex((s) => s?.groupId === station?.groupId) + 1;
  return stations[index];
};

export default getNextStation;
