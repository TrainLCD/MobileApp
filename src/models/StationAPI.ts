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

export interface ILine {
  id: string;
  companyId: number;
  lineColorC: string | null;
  name: string;
  __typename: 'Line';
}
