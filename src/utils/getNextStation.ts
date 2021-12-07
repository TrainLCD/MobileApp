import { Station } from '../models/StationAPI';

const getNextStation = (leftStations: Station[], station: Station): Station => {
  const index =
    leftStations.findIndex((s) => s?.groupId === station?.groupId) + 1;
  return leftStations[index];
};

export default getNextStation;
