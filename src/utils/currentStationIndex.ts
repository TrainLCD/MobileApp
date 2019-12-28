import {IStation} from '../models/StationAPI';

export const getCurrentStationIndex = (stations: IStation[], nearestStation: IStation) => stations.findIndex(
  (s) => s.groupId === nearestStation.groupId,
);
