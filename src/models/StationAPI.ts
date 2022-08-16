export enum StopCondition {
  ALL = 'ALL',
  NOT = 'NOT',
  PARTIAL = 'PARTIAL',
  WEEKDAY = 'WEEKDAY',
  HOLIDAY = 'HOLIDAY',
  PARTIAL_STOP = 'PARTIAL_STOP',
}

export enum TrainDirection {
  BOTH = 'BOTH',
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export interface StationData {
  station: Station;
}

export interface StationsByNameData {
  stationsByName: Station[];
}

export interface NearbyStationsData {
  nearbyStations: Station[];
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

export interface StationNumber {
  lineSymbol: string;
  lineSymbolColor: string;
  stationNumber: string;
}

export interface APITrainTypeMinimum {
  id: number;
  typeId: number;
  groupId: number;
  name: string;
  nameK: string;
  nameR: string;
  nameZh: string;
  nameKo: string;
  color: string;
  line: Line;
}
export interface APITrainType {
  id: number;
  typeId: number;
  groupId: number;
  name: string;
  nameK: string;
  nameR: string;
  nameZh: string;
  nameKo: string;
  stations: Station[];
  color: string;
  allTrainTypes: APITrainTypeMinimum[];
  direction: TrainDirection;
  lines: Line[];
}

export interface Station {
  id: number;
  groupId: number;
  prefId: number;
  name: string;
  nameK: string;
  nameR: string;
  nameZh: string;
  nameKo: string;
  nameForSearch?: string;
  nameForSearchR?: string;
  address: string;
  currentLine: Line;
  lines: Line[];
  latitude: number;
  longitude: number;
  distance?: number;
  trainTypes: APITrainType[];
  stopCondition: StopCondition;
  stationNumbers: StationNumber[];
  threeLetterCode: string;
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

export interface Company {
  nameR: string;
  nameEn: string;
}

export interface LineSymbol {
  lineSymbol: string;
  lineSymbolColor: string;
}

export interface Line {
  id: number;
  companyId: number;
  lineColorC: string | null;
  name: string;
  nameR: string;
  nameK: string;
  nameZh: string;
  nameKo: string;
  lineType: LineType;
  lineSymbols: LineSymbol[];
  company: Company;
  __typename: 'Line';
}
