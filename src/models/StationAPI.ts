export interface StationData {
  station: Station;
}

export interface StationByCoordsData {
  stationByCoords: Station;
}

export interface StationsByNameData {
  stationsByName: Station[];
}

export interface StationsByLineIdData {
  stationsByLineId: Station[];
}

export interface LineByIdData {
  line: Line;
}

export interface TrainTypeData {
  trainType: APITrainType;
}

export interface APITrainType {
  id: number;
  groupId: number;
  name: string;
  nameK: string;
  nameR: string;
  stations: Station[];
  color: string;
  lines: Line[];
}

export interface Station {
  id: number;
  groupId: number;
  prefId: number;
  name: string;
  nameK: string;
  nameR: string;
  nameForSearch?: string;
  nameForSearchR?: string;
  address: string;
  lines: Line[];
  latitude: number;
  longitude: number;
  distance?: number;
  trainTypes: APITrainType[];
  pass?: boolean;
  __typename: 'Station';
}

export enum LineType {
  Other,
  BulletTrain,
  Normal,
  Subway,
  Tram,
  Monorail,
  AGT,
}

export interface Line {
  id: number;
  companyId: number;
  lineColorC: string | null;
  name: string;
  nameR: string;
  nameK: string;
  lineType: LineType;
  __typename: 'Line';
}
