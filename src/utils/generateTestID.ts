import type { Line, Route, Station, TrainType } from '~/@types/graphql';

export const generateStationTestId = (station: Pick<Station, 'id'>) =>
  `station_${station.id}`;
export const generateStationGroupTestId = (station: Pick<Station, 'groupId'>) =>
  `station_group_${station.groupId}`;
export const generateLineTestId = (line: Pick<Line, 'id'>) => `line_${line.id}`;
export const generateTrainTypeTestId = (trainType: Pick<TrainType, 'id'>) =>
  `train_type_${trainType.id}`;
export const generateRouteTestId = (route: Pick<Route, 'id'>) =>
  `route_${route.id}`;
