export interface IStationData {
  station: IStation;
}

export interface IStationByCoordsData {
  stationByCoords: IStation;
}

export interface IStationsByLineIdData {
  stationsByLineId: IStation[];
}

export interface ILineByIdData {
  line: ILine;
}

export interface IStation {
  groupId: number;
  name: string;
  nameK: string;
  address: string;
  lines: ILine[];
  latitude: number;
  longitude: number;
  distance: number;
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

export interface ILine {
  id: string;
  companyId: number;
  lineColorC: string | null;
  name: string;
  nameK: string;
  lineType: LineType;
  __typename: 'Line';
}
