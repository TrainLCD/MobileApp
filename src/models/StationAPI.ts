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

export interface Station {
  id: string;
  groupId: number;
  prefId: number;
  name: string;
  nameK: string;
  nameR: string;
  address: string;
  lines: Line[];
  latitude: number;
  longitude: number;
  distance?: number;
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
  id: string;
  companyId: number;
  lineColorC: string | null;
  name: string;
  nameR: string;
  lineType: LineType;
  __typename: 'Line';
}
