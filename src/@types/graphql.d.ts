export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

export type Company = {
  __typename: 'Company';
  id: Maybe<Scalars['Int']['output']>;
  name: Maybe<Scalars['String']['output']>;
  nameEnglishFull: Maybe<Scalars['String']['output']>;
  nameEnglishShort: Maybe<Scalars['String']['output']>;
  nameFull: Maybe<Scalars['String']['output']>;
  nameKatakana: Maybe<Scalars['String']['output']>;
  nameShort: Maybe<Scalars['String']['output']>;
  railroadId: Maybe<Scalars['Int']['output']>;
  status: Maybe<OperationStatus>;
  type: Maybe<CompanyType>;
  url: Maybe<Scalars['String']['output']>;
};

export enum CompanyType {
  Jr = 'JR',
  Major = 'Major',
  OtherCompany = 'OtherCompany',
  Private = 'Private',
  SemiMajor = 'SemiMajor',
}

export type Line = {
  __typename: 'Line';
  averageDistance: Maybe<Scalars['Float']['output']>;
  color: Maybe<Scalars['String']['output']>;
  company: Maybe<Company>;
  id: Maybe<Scalars['Int']['output']>;
  lineSymbols: Maybe<Array<LineSymbol>>;
  lineType: Maybe<LineType>;
  nameChinese: Maybe<Scalars['String']['output']>;
  nameFull: Maybe<Scalars['String']['output']>;
  nameKatakana: Maybe<Scalars['String']['output']>;
  nameKorean: Maybe<Scalars['String']['output']>;
  nameRoman: Maybe<Scalars['String']['output']>;
  nameShort: Maybe<Scalars['String']['output']>;
  station: Maybe<Station>;
  status: Maybe<OperationStatus>;
  trainType: Maybe<TrainType>;
};

export type LineSymbol = {
  __typename: 'LineSymbol';
  color: Maybe<Scalars['String']['output']>;
  shape: Maybe<Scalars['String']['output']>;
  symbol: Maybe<Scalars['String']['output']>;
};

export enum LineType {
  BulletTrain = 'BulletTrain',
  MonorailOrAgt = 'MonorailOrAGT',
  Normal = 'Normal',
  OtherLineType = 'OtherLineType',
  Subway = 'Subway',
  Tram = 'Tram',
}

export enum OperationStatus {
  Closed = 'Closed',
  InOperation = 'InOperation',
  NotOpened = 'NotOpened',
}

export type Query = {
  __typename: 'Query';
  connectedRoutes: Array<Route>;
  line: Maybe<Line>;
  lineGroupStations: Array<Station>;
  lineStations: Array<Station>;
  linesByName: Array<Line>;
  routeTypes: RouteTypePage;
  routes: RoutePage;
  station: Maybe<Station>;
  stationGroupStations: Array<Station>;
  stationTrainTypes: Array<TrainType>;
  stations: Array<Station>;
  stationsByName: Array<Station>;
  stationsNearby: Array<Station>;
};

export type QueryConnectedRoutesArgs = {
  fromStationGroupId: Scalars['Int']['input'];
  toStationGroupId: Scalars['Int']['input'];
};

export type QueryLineArgs = {
  lineId: Scalars['Int']['input'];
};

export type QueryLineGroupStationsArgs = {
  lineGroupId: Scalars['Int']['input'];
};

export type QueryLineStationsArgs = {
  lineId: Scalars['Int']['input'];
  stationId?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryLinesByNameArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
};

export type QueryRouteTypesArgs = {
  fromStationGroupId: Scalars['Int']['input'];
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  toStationGroupId: Scalars['Int']['input'];
};

export type QueryRoutesArgs = {
  fromStationGroupId: Scalars['Int']['input'];
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
  toStationGroupId: Scalars['Int']['input'];
};

export type QueryStationArgs = {
  id: Scalars['Int']['input'];
};

export type QueryStationGroupStationsArgs = {
  groupId: Scalars['Int']['input'];
};

export type QueryStationTrainTypesArgs = {
  stationId: Scalars['Int']['input'];
};

export type QueryStationsArgs = {
  ids: Array<Scalars['Int']['input']>;
};

export type QueryStationsByNameArgs = {
  fromStationGroupId?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  name: Scalars['String']['input'];
};

export type QueryStationsNearbyArgs = {
  latitude: Scalars['Float']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  longitude: Scalars['Float']['input'];
};

export type Route = {
  __typename: 'Route';
  id: Maybe<Scalars['Int']['output']>;
  stops: Maybe<Array<Station>>;
};

export type RoutePage = {
  __typename: 'RoutePage';
  nextPageToken: Maybe<Scalars['String']['output']>;
  routes: Maybe<Array<Route>>;
};

export type RouteTypePage = {
  __typename: 'RouteTypePage';
  nextPageToken: Maybe<Scalars['String']['output']>;
  trainTypes: Maybe<Array<TrainType>>;
};

export type Station = {
  __typename: 'Station';
  address: Maybe<Scalars['String']['output']>;
  closedAt: Maybe<Scalars['String']['output']>;
  distance: Maybe<Scalars['Float']['output']>;
  groupId: Maybe<Scalars['Int']['output']>;
  hasTrainTypes: Maybe<Scalars['Boolean']['output']>;
  id: Maybe<Scalars['Int']['output']>;
  latitude: Maybe<Scalars['Float']['output']>;
  line: Maybe<Line>;
  lines: Maybe<Array<Line>>;
  longitude: Maybe<Scalars['Float']['output']>;
  name: Maybe<Scalars['String']['output']>;
  nameChinese: Maybe<Scalars['String']['output']>;
  nameKatakana: Maybe<Scalars['String']['output']>;
  nameKorean: Maybe<Scalars['String']['output']>;
  nameRoman: Maybe<Scalars['String']['output']>;
  openedAt: Maybe<Scalars['String']['output']>;
  postalCode: Maybe<Scalars['String']['output']>;
  prefectureId: Maybe<Scalars['Int']['output']>;
  stationNumbers: Maybe<Array<StationNumber>>;
  status: Maybe<OperationStatus>;
  stopCondition: Maybe<StopCondition>;
  threeLetterCode: Maybe<Scalars['String']['output']>;
  trainType: Maybe<TrainType>;
};

export type StationNumber = {
  __typename: 'StationNumber';
  lineSymbol: Maybe<Scalars['String']['output']>;
  lineSymbolColor: Maybe<Scalars['String']['output']>;
  lineSymbolShape: Maybe<Scalars['String']['output']>;
  stationNumber: Maybe<Scalars['String']['output']>;
};

export enum StopCondition {
  All = 'All',
  Holiday = 'Holiday',
  Not = 'Not',
  Partial = 'Partial',
  PartialStop = 'PartialStop',
  Weekday = 'Weekday',
}

export enum TrainDirection {
  Both = 'Both',
  Inbound = 'Inbound',
  Outbound = 'Outbound',
}

export type TrainType = {
  __typename: 'TrainType';
  color: Maybe<Scalars['String']['output']>;
  direction: Maybe<TrainDirection>;
  groupId: Maybe<Scalars['Int']['output']>;
  id: Maybe<Scalars['Int']['output']>;
  kind: Maybe<TrainTypeKind>;
  line: Maybe<Line>;
  lines: Maybe<Array<Line>>;
  name: Maybe<Scalars['String']['output']>;
  nameChinese: Maybe<Scalars['String']['output']>;
  nameKatakana: Maybe<Scalars['String']['output']>;
  nameKorean: Maybe<Scalars['String']['output']>;
  nameRoman: Maybe<Scalars['String']['output']>;
  typeId: Maybe<Scalars['Int']['output']>;
};

export enum TrainTypeKind {
  Branch = 'Branch',
  Default = 'Default',
  Express = 'Express',
  HighSpeedRapid = 'HighSpeedRapid',
  LimitedExpress = 'LimitedExpress',
  Rapid = 'Rapid',
}

export type CompanyFieldsFragment = {
  __typename: 'Company';
  id: number | null | undefined;
  name: string | null | undefined;
  nameEnglishFull: string | null | undefined;
  nameEnglishShort: string | null | undefined;
  nameFull: string | null | undefined;
  nameKatakana: string | null | undefined;
  nameShort: string | null | undefined;
  railroadId: number | null | undefined;
  status: OperationStatus | null | undefined;
  type: CompanyType | null | undefined;
  url: string | null | undefined;
};

export type LineSymbolFieldsFragment = {
  __typename: 'LineSymbol';
  color: string | null | undefined;
  shape: string | null | undefined;
  symbol: string | null | undefined;
};

export type StationNumberFieldsFragment = {
  __typename: 'StationNumber';
  lineSymbol: string | null | undefined;
  lineSymbolColor: string | null | undefined;
  lineSymbolShape: string | null | undefined;
  stationNumber: string | null | undefined;
};

export type LineFieldsFragment = {
  __typename: 'Line';
  id: number | null | undefined;
  averageDistance: number | null | undefined;
  color: string | null | undefined;
  lineType: LineType | null | undefined;
  nameFull: string | null | undefined;
  nameKatakana: string | null | undefined;
  nameRoman: string | null | undefined;
  nameShort: string | null | undefined;
  status: OperationStatus | null | undefined;
  company:
    | {
        __typename: 'Company';
        id: number | null | undefined;
        name: string | null | undefined;
        nameEnglishFull: string | null | undefined;
        nameEnglishShort: string | null | undefined;
        nameFull: string | null | undefined;
        nameKatakana: string | null | undefined;
        nameShort: string | null | undefined;
        railroadId: number | null | undefined;
        status: OperationStatus | null | undefined;
        type: CompanyType | null | undefined;
        url: string | null | undefined;
      }
    | null
    | undefined;
  lineSymbols:
    | Array<{
        __typename: 'LineSymbol';
        color: string | null | undefined;
        shape: string | null | undefined;
        symbol: string | null | undefined;
      }>
    | null
    | undefined;
};

export type TrainTypeFieldsFragment = {
  __typename: 'TrainType';
  id: number | null | undefined;
  typeId: number | null | undefined;
  groupId: number | null | undefined;
  name: string | null | undefined;
  nameKatakana: string | null | undefined;
  nameRoman: string | null | undefined;
  nameChinese: string | null | undefined;
  nameKorean: string | null | undefined;
  color: string | null | undefined;
  direction: TrainDirection | null | undefined;
  kind: TrainTypeKind | null | undefined;
  line:
    | {
        __typename: 'Line';
        id: number | null | undefined;
        averageDistance: number | null | undefined;
        color: string | null | undefined;
        lineType: LineType | null | undefined;
        nameFull: string | null | undefined;
        nameKatakana: string | null | undefined;
        nameRoman: string | null | undefined;
        nameShort: string | null | undefined;
        status: OperationStatus | null | undefined;
        company:
          | {
              __typename: 'Company';
              id: number | null | undefined;
              name: string | null | undefined;
              nameEnglishFull: string | null | undefined;
              nameEnglishShort: string | null | undefined;
              nameFull: string | null | undefined;
              nameKatakana: string | null | undefined;
              nameShort: string | null | undefined;
              railroadId: number | null | undefined;
              status: OperationStatus | null | undefined;
              type: CompanyType | null | undefined;
              url: string | null | undefined;
            }
          | null
          | undefined;
        lineSymbols:
          | Array<{
              __typename: 'LineSymbol';
              color: string | null | undefined;
              shape: string | null | undefined;
              symbol: string | null | undefined;
            }>
          | null
          | undefined;
      }
    | null
    | undefined;
  lines:
    | Array<{
        __typename: 'Line';
        id: number | null | undefined;
        averageDistance: number | null | undefined;
        color: string | null | undefined;
        lineType: LineType | null | undefined;
        nameFull: string | null | undefined;
        nameKatakana: string | null | undefined;
        nameRoman: string | null | undefined;
        nameShort: string | null | undefined;
        status: OperationStatus | null | undefined;
        company:
          | {
              __typename: 'Company';
              id: number | null | undefined;
              name: string | null | undefined;
              nameEnglishFull: string | null | undefined;
              nameEnglishShort: string | null | undefined;
              nameFull: string | null | undefined;
              nameKatakana: string | null | undefined;
              nameShort: string | null | undefined;
              railroadId: number | null | undefined;
              status: OperationStatus | null | undefined;
              type: CompanyType | null | undefined;
              url: string | null | undefined;
            }
          | null
          | undefined;
        lineSymbols:
          | Array<{
              __typename: 'LineSymbol';
              color: string | null | undefined;
              shape: string | null | undefined;
              symbol: string | null | undefined;
            }>
          | null
          | undefined;
      }>
    | null
    | undefined;
};

export type StationFieldsFragment = {
  __typename: 'Station';
  id: number | null | undefined;
  groupId: number | null | undefined;
  name: string | null | undefined;
  nameKatakana: string | null | undefined;
  nameRoman: string | null | undefined;
  nameChinese: string | null | undefined;
  nameKorean: string | null | undefined;
  threeLetterCode: string | null | undefined;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  address: string | null | undefined;
  postalCode: string | null | undefined;
  prefectureId: number | null | undefined;
  openedAt: string | null | undefined;
  closedAt: string | null | undefined;
  status: OperationStatus | null | undefined;
  distance: number | null | undefined;
  hasTrainTypes: boolean | null | undefined;
  stopCondition: StopCondition | null | undefined;
  stationNumbers:
    | Array<{
        __typename: 'StationNumber';
        lineSymbol: string | null | undefined;
        lineSymbolColor: string | null | undefined;
        lineSymbolShape: string | null | undefined;
        stationNumber: string | null | undefined;
      }>
    | null
    | undefined;
  line:
    | {
        __typename: 'Line';
        id: number | null | undefined;
        averageDistance: number | null | undefined;
        color: string | null | undefined;
        lineType: LineType | null | undefined;
        nameFull: string | null | undefined;
        nameKatakana: string | null | undefined;
        nameRoman: string | null | undefined;
        nameShort: string | null | undefined;
        status: OperationStatus | null | undefined;
        company:
          | {
              __typename: 'Company';
              id: number | null | undefined;
              name: string | null | undefined;
              nameEnglishFull: string | null | undefined;
              nameEnglishShort: string | null | undefined;
              nameFull: string | null | undefined;
              nameKatakana: string | null | undefined;
              nameShort: string | null | undefined;
              railroadId: number | null | undefined;
              status: OperationStatus | null | undefined;
              type: CompanyType | null | undefined;
              url: string | null | undefined;
            }
          | null
          | undefined;
        lineSymbols:
          | Array<{
              __typename: 'LineSymbol';
              color: string | null | undefined;
              shape: string | null | undefined;
              symbol: string | null | undefined;
            }>
          | null
          | undefined;
      }
    | null
    | undefined;
  trainType:
    | {
        __typename: 'TrainType';
        id: number | null | undefined;
        typeId: number | null | undefined;
        groupId: number | null | undefined;
        name: string | null | undefined;
        nameKatakana: string | null | undefined;
        nameRoman: string | null | undefined;
        nameChinese: string | null | undefined;
        nameKorean: string | null | undefined;
        color: string | null | undefined;
        direction: TrainDirection | null | undefined;
        kind: TrainTypeKind | null | undefined;
        lines:
          | Array<{
              __typename: 'Line';
              id: number | null | undefined;
              averageDistance: number | null | undefined;
              color: string | null | undefined;
              lineType: LineType | null | undefined;
              nameFull: string | null | undefined;
              nameKatakana: string | null | undefined;
              nameRoman: string | null | undefined;
              nameShort: string | null | undefined;
              status: OperationStatus | null | undefined;
              company:
                | {
                    __typename: 'Company';
                    id: number | null | undefined;
                    name: string | null | undefined;
                    nameEnglishFull: string | null | undefined;
                    nameEnglishShort: string | null | undefined;
                    nameFull: string | null | undefined;
                    nameKatakana: string | null | undefined;
                    nameShort: string | null | undefined;
                    railroadId: number | null | undefined;
                    status: OperationStatus | null | undefined;
                    type: CompanyType | null | undefined;
                    url: string | null | undefined;
                  }
                | null
                | undefined;
              lineSymbols:
                | Array<{
                    __typename: 'LineSymbol';
                    color: string | null | undefined;
                    shape: string | null | undefined;
                    symbol: string | null | undefined;
                  }>
                | null
                | undefined;
            }>
          | null
          | undefined;
        line:
          | {
              __typename: 'Line';
              id: number | null | undefined;
              averageDistance: number | null | undefined;
              color: string | null | undefined;
              lineType: LineType | null | undefined;
              nameFull: string | null | undefined;
              nameKatakana: string | null | undefined;
              nameRoman: string | null | undefined;
              nameShort: string | null | undefined;
              status: OperationStatus | null | undefined;
              company:
                | {
                    __typename: 'Company';
                    id: number | null | undefined;
                    name: string | null | undefined;
                    nameEnglishFull: string | null | undefined;
                    nameEnglishShort: string | null | undefined;
                    nameFull: string | null | undefined;
                    nameKatakana: string | null | undefined;
                    nameShort: string | null | undefined;
                    railroadId: number | null | undefined;
                    status: OperationStatus | null | undefined;
                    type: CompanyType | null | undefined;
                    url: string | null | undefined;
                  }
                | null
                | undefined;
              lineSymbols:
                | Array<{
                    __typename: 'LineSymbol';
                    color: string | null | undefined;
                    shape: string | null | undefined;
                    symbol: string | null | undefined;
                  }>
                | null
                | undefined;
            }
          | null
          | undefined;
      }
    | null
    | undefined;
};

export type GetStationsNearbyQueryVariables = Exact<{
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetStationsNearbyQuery = {
  stationsNearby: Array<{
    __typename: 'Station';
    id: number | null | undefined;
    groupId: number | null | undefined;
    name: string | null | undefined;
    nameKatakana: string | null | undefined;
    nameRoman: string | null | undefined;
    nameChinese: string | null | undefined;
    nameKorean: string | null | undefined;
    threeLetterCode: string | null | undefined;
    latitude: number | null | undefined;
    longitude: number | null | undefined;
    address: string | null | undefined;
    postalCode: string | null | undefined;
    prefectureId: number | null | undefined;
    openedAt: string | null | undefined;
    closedAt: string | null | undefined;
    status: OperationStatus | null | undefined;
    distance: number | null | undefined;
    hasTrainTypes: boolean | null | undefined;
    stopCondition: StopCondition | null | undefined;
    lines:
      | Array<{
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }>
      | null
      | undefined;
    stationNumbers:
      | Array<{
          __typename: 'StationNumber';
          lineSymbol: string | null | undefined;
          lineSymbolColor: string | null | undefined;
          lineSymbolShape: string | null | undefined;
          stationNumber: string | null | undefined;
        }>
      | null
      | undefined;
    line:
      | {
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }
      | null
      | undefined;
    trainType:
      | {
          __typename: 'TrainType';
          id: number | null | undefined;
          typeId: number | null | undefined;
          groupId: number | null | undefined;
          name: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameChinese: string | null | undefined;
          nameKorean: string | null | undefined;
          color: string | null | undefined;
          direction: TrainDirection | null | undefined;
          kind: TrainTypeKind | null | undefined;
          lines:
            | Array<{
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }>
            | null
            | undefined;
          line:
            | {
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }
            | null
            | undefined;
        }
      | null
      | undefined;
  }>;
};

export type GetLineStationsQueryVariables = Exact<{
  lineId: Scalars['Int']['input'];
  stationId?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetLineStationsQuery = {
  lineStations: Array<{
    __typename: 'Station';
    id: number | null | undefined;
    groupId: number | null | undefined;
    name: string | null | undefined;
    nameKatakana: string | null | undefined;
    nameRoman: string | null | undefined;
    nameChinese: string | null | undefined;
    nameKorean: string | null | undefined;
    threeLetterCode: string | null | undefined;
    latitude: number | null | undefined;
    longitude: number | null | undefined;
    address: string | null | undefined;
    postalCode: string | null | undefined;
    prefectureId: number | null | undefined;
    openedAt: string | null | undefined;
    closedAt: string | null | undefined;
    status: OperationStatus | null | undefined;
    distance: number | null | undefined;
    hasTrainTypes: boolean | null | undefined;
    stopCondition: StopCondition | null | undefined;
    lines:
      | Array<{
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }>
      | null
      | undefined;
    stationNumbers:
      | Array<{
          __typename: 'StationNumber';
          lineSymbol: string | null | undefined;
          lineSymbolColor: string | null | undefined;
          lineSymbolShape: string | null | undefined;
          stationNumber: string | null | undefined;
        }>
      | null
      | undefined;
    line:
      | {
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }
      | null
      | undefined;
    trainType:
      | {
          __typename: 'TrainType';
          id: number | null | undefined;
          typeId: number | null | undefined;
          groupId: number | null | undefined;
          name: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameChinese: string | null | undefined;
          nameKorean: string | null | undefined;
          color: string | null | undefined;
          direction: TrainDirection | null | undefined;
          kind: TrainTypeKind | null | undefined;
          lines:
            | Array<{
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }>
            | null
            | undefined;
          line:
            | {
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }
            | null
            | undefined;
        }
      | null
      | undefined;
  }>;
};

export type GetStationsByNameQueryVariables = Exact<{
  name: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  fromStationGroupId?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetStationsByNameQuery = {
  stationsByName: Array<{
    __typename: 'Station';
    id: number | null | undefined;
    groupId: number | null | undefined;
    name: string | null | undefined;
    nameKatakana: string | null | undefined;
    nameRoman: string | null | undefined;
    nameChinese: string | null | undefined;
    nameKorean: string | null | undefined;
    threeLetterCode: string | null | undefined;
    latitude: number | null | undefined;
    longitude: number | null | undefined;
    address: string | null | undefined;
    postalCode: string | null | undefined;
    prefectureId: number | null | undefined;
    openedAt: string | null | undefined;
    closedAt: string | null | undefined;
    status: OperationStatus | null | undefined;
    distance: number | null | undefined;
    hasTrainTypes: boolean | null | undefined;
    stopCondition: StopCondition | null | undefined;
    lines:
      | Array<{
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }>
      | null
      | undefined;
    stationNumbers:
      | Array<{
          __typename: 'StationNumber';
          lineSymbol: string | null | undefined;
          lineSymbolColor: string | null | undefined;
          lineSymbolShape: string | null | undefined;
          stationNumber: string | null | undefined;
        }>
      | null
      | undefined;
    line:
      | {
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }
      | null
      | undefined;
    trainType:
      | {
          __typename: 'TrainType';
          id: number | null | undefined;
          typeId: number | null | undefined;
          groupId: number | null | undefined;
          name: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameChinese: string | null | undefined;
          nameKorean: string | null | undefined;
          color: string | null | undefined;
          direction: TrainDirection | null | undefined;
          kind: TrainTypeKind | null | undefined;
          lines:
            | Array<{
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }>
            | null
            | undefined;
          line:
            | {
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }
            | null
            | undefined;
        }
      | null
      | undefined;
  }>;
};

export type GetLineGroupStationsQueryVariables = Exact<{
  lineGroupId: Scalars['Int']['input'];
}>;

export type GetLineGroupStationsQuery = {
  lineGroupStations: Array<{
    __typename: 'Station';
    id: number | null | undefined;
    groupId: number | null | undefined;
    name: string | null | undefined;
    nameKatakana: string | null | undefined;
    nameRoman: string | null | undefined;
    nameChinese: string | null | undefined;
    nameKorean: string | null | undefined;
    threeLetterCode: string | null | undefined;
    latitude: number | null | undefined;
    longitude: number | null | undefined;
    address: string | null | undefined;
    postalCode: string | null | undefined;
    prefectureId: number | null | undefined;
    openedAt: string | null | undefined;
    closedAt: string | null | undefined;
    status: OperationStatus | null | undefined;
    distance: number | null | undefined;
    hasTrainTypes: boolean | null | undefined;
    stopCondition: StopCondition | null | undefined;
    lines:
      | Array<{
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }>
      | null
      | undefined;
    stationNumbers:
      | Array<{
          __typename: 'StationNumber';
          lineSymbol: string | null | undefined;
          lineSymbolColor: string | null | undefined;
          lineSymbolShape: string | null | undefined;
          stationNumber: string | null | undefined;
        }>
      | null
      | undefined;
    line:
      | {
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }
      | null
      | undefined;
    trainType:
      | {
          __typename: 'TrainType';
          id: number | null | undefined;
          typeId: number | null | undefined;
          groupId: number | null | undefined;
          name: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameChinese: string | null | undefined;
          nameKorean: string | null | undefined;
          color: string | null | undefined;
          direction: TrainDirection | null | undefined;
          kind: TrainTypeKind | null | undefined;
          lines:
            | Array<{
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }>
            | null
            | undefined;
          line:
            | {
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }
            | null
            | undefined;
        }
      | null
      | undefined;
  }>;
};

export type GetStationTrainTypesQueryVariables = Exact<{
  stationId: Scalars['Int']['input'];
}>;

export type GetStationTrainTypesQuery = {
  stationTrainTypes: Array<{
    __typename: 'TrainType';
    id: number | null | undefined;
    typeId: number | null | undefined;
    groupId: number | null | undefined;
    name: string | null | undefined;
    nameKatakana: string | null | undefined;
    nameRoman: string | null | undefined;
    nameChinese: string | null | undefined;
    nameKorean: string | null | undefined;
    color: string | null | undefined;
    direction: TrainDirection | null | undefined;
    kind: TrainTypeKind | null | undefined;
    line:
      | {
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }
      | null
      | undefined;
    lines:
      | Array<{
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }>
      | null
      | undefined;
  }>;
};

export type GetStationsQueryVariables = Exact<{
  ids: Array<Scalars['Int']['input']> | Scalars['Int']['input'];
}>;

export type GetStationsQuery = {
  stations: Array<{
    __typename: 'Station';
    id: number | null | undefined;
    groupId: number | null | undefined;
    name: string | null | undefined;
    nameKatakana: string | null | undefined;
    nameRoman: string | null | undefined;
    nameChinese: string | null | undefined;
    nameKorean: string | null | undefined;
    threeLetterCode: string | null | undefined;
    latitude: number | null | undefined;
    longitude: number | null | undefined;
    address: string | null | undefined;
    postalCode: string | null | undefined;
    prefectureId: number | null | undefined;
    openedAt: string | null | undefined;
    closedAt: string | null | undefined;
    status: OperationStatus | null | undefined;
    distance: number | null | undefined;
    hasTrainTypes: boolean | null | undefined;
    stopCondition: StopCondition | null | undefined;
    lines:
      | Array<{
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }>
      | null
      | undefined;
    stationNumbers:
      | Array<{
          __typename: 'StationNumber';
          lineSymbol: string | null | undefined;
          lineSymbolColor: string | null | undefined;
          lineSymbolShape: string | null | undefined;
          stationNumber: string | null | undefined;
        }>
      | null
      | undefined;
    line:
      | {
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }
      | null
      | undefined;
    trainType:
      | {
          __typename: 'TrainType';
          id: number | null | undefined;
          typeId: number | null | undefined;
          groupId: number | null | undefined;
          name: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameChinese: string | null | undefined;
          nameKorean: string | null | undefined;
          color: string | null | undefined;
          direction: TrainDirection | null | undefined;
          kind: TrainTypeKind | null | undefined;
          lines:
            | Array<{
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }>
            | null
            | undefined;
          line:
            | {
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }
            | null
            | undefined;
        }
      | null
      | undefined;
  }>;
};

export type GetRoutesQueryVariables = Exact<{
  fromStationGroupId: Scalars['Int']['input'];
  toStationGroupId: Scalars['Int']['input'];
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
}>;

export type GetRoutesQuery = {
  routes: {
    __typename: 'RoutePage';
    nextPageToken: string | null | undefined;
    routes:
      | Array<{
          __typename: 'Route';
          id: number | null | undefined;
          stops:
            | Array<{
                __typename: 'Station';
                id: number | null | undefined;
                groupId: number | null | undefined;
                name: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameChinese: string | null | undefined;
                nameKorean: string | null | undefined;
                threeLetterCode: string | null | undefined;
                latitude: number | null | undefined;
                longitude: number | null | undefined;
                address: string | null | undefined;
                postalCode: string | null | undefined;
                prefectureId: number | null | undefined;
                openedAt: string | null | undefined;
                closedAt: string | null | undefined;
                status: OperationStatus | null | undefined;
                distance: number | null | undefined;
                hasTrainTypes: boolean | null | undefined;
                stopCondition: StopCondition | null | undefined;
                lines:
                  | Array<{
                      __typename: 'Line';
                      id: number | null | undefined;
                      averageDistance: number | null | undefined;
                      color: string | null | undefined;
                      lineType: LineType | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameRoman: string | null | undefined;
                      nameShort: string | null | undefined;
                      status: OperationStatus | null | undefined;
                      company:
                        | {
                            __typename: 'Company';
                            id: number | null | undefined;
                            name: string | null | undefined;
                            nameEnglishFull: string | null | undefined;
                            nameEnglishShort: string | null | undefined;
                            nameFull: string | null | undefined;
                            nameKatakana: string | null | undefined;
                            nameShort: string | null | undefined;
                            railroadId: number | null | undefined;
                            status: OperationStatus | null | undefined;
                            type: CompanyType | null | undefined;
                            url: string | null | undefined;
                          }
                        | null
                        | undefined;
                      lineSymbols:
                        | Array<{
                            __typename: 'LineSymbol';
                            color: string | null | undefined;
                            shape: string | null | undefined;
                            symbol: string | null | undefined;
                          }>
                        | null
                        | undefined;
                    }>
                  | null
                  | undefined;
                stationNumbers:
                  | Array<{
                      __typename: 'StationNumber';
                      lineSymbol: string | null | undefined;
                      lineSymbolColor: string | null | undefined;
                      lineSymbolShape: string | null | undefined;
                      stationNumber: string | null | undefined;
                    }>
                  | null
                  | undefined;
                line:
                  | {
                      __typename: 'Line';
                      id: number | null | undefined;
                      averageDistance: number | null | undefined;
                      color: string | null | undefined;
                      lineType: LineType | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameRoman: string | null | undefined;
                      nameShort: string | null | undefined;
                      status: OperationStatus | null | undefined;
                      company:
                        | {
                            __typename: 'Company';
                            id: number | null | undefined;
                            name: string | null | undefined;
                            nameEnglishFull: string | null | undefined;
                            nameEnglishShort: string | null | undefined;
                            nameFull: string | null | undefined;
                            nameKatakana: string | null | undefined;
                            nameShort: string | null | undefined;
                            railroadId: number | null | undefined;
                            status: OperationStatus | null | undefined;
                            type: CompanyType | null | undefined;
                            url: string | null | undefined;
                          }
                        | null
                        | undefined;
                      lineSymbols:
                        | Array<{
                            __typename: 'LineSymbol';
                            color: string | null | undefined;
                            shape: string | null | undefined;
                            symbol: string | null | undefined;
                          }>
                        | null
                        | undefined;
                    }
                  | null
                  | undefined;
                trainType:
                  | {
                      __typename: 'TrainType';
                      id: number | null | undefined;
                      typeId: number | null | undefined;
                      groupId: number | null | undefined;
                      name: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameRoman: string | null | undefined;
                      nameChinese: string | null | undefined;
                      nameKorean: string | null | undefined;
                      color: string | null | undefined;
                      direction: TrainDirection | null | undefined;
                      kind: TrainTypeKind | null | undefined;
                      lines:
                        | Array<{
                            __typename: 'Line';
                            id: number | null | undefined;
                            averageDistance: number | null | undefined;
                            color: string | null | undefined;
                            lineType: LineType | null | undefined;
                            nameFull: string | null | undefined;
                            nameKatakana: string | null | undefined;
                            nameRoman: string | null | undefined;
                            nameShort: string | null | undefined;
                            status: OperationStatus | null | undefined;
                            company:
                              | {
                                  __typename: 'Company';
                                  id: number | null | undefined;
                                  name: string | null | undefined;
                                  nameEnglishFull: string | null | undefined;
                                  nameEnglishShort: string | null | undefined;
                                  nameFull: string | null | undefined;
                                  nameKatakana: string | null | undefined;
                                  nameShort: string | null | undefined;
                                  railroadId: number | null | undefined;
                                  status: OperationStatus | null | undefined;
                                  type: CompanyType | null | undefined;
                                  url: string | null | undefined;
                                }
                              | null
                              | undefined;
                            lineSymbols:
                              | Array<{
                                  __typename: 'LineSymbol';
                                  color: string | null | undefined;
                                  shape: string | null | undefined;
                                  symbol: string | null | undefined;
                                }>
                              | null
                              | undefined;
                          }>
                        | null
                        | undefined;
                      line:
                        | {
                            __typename: 'Line';
                            id: number | null | undefined;
                            averageDistance: number | null | undefined;
                            color: string | null | undefined;
                            lineType: LineType | null | undefined;
                            nameFull: string | null | undefined;
                            nameKatakana: string | null | undefined;
                            nameRoman: string | null | undefined;
                            nameShort: string | null | undefined;
                            status: OperationStatus | null | undefined;
                            company:
                              | {
                                  __typename: 'Company';
                                  id: number | null | undefined;
                                  name: string | null | undefined;
                                  nameEnglishFull: string | null | undefined;
                                  nameEnglishShort: string | null | undefined;
                                  nameFull: string | null | undefined;
                                  nameKatakana: string | null | undefined;
                                  nameShort: string | null | undefined;
                                  railroadId: number | null | undefined;
                                  status: OperationStatus | null | undefined;
                                  type: CompanyType | null | undefined;
                                  url: string | null | undefined;
                                }
                              | null
                              | undefined;
                            lineSymbols:
                              | Array<{
                                  __typename: 'LineSymbol';
                                  color: string | null | undefined;
                                  shape: string | null | undefined;
                                  symbol: string | null | undefined;
                                }>
                              | null
                              | undefined;
                          }
                        | null
                        | undefined;
                    }
                  | null
                  | undefined;
              }>
            | null
            | undefined;
        }>
      | null
      | undefined;
  };
};

export type GetConnectedRoutesQueryVariables = Exact<{
  fromStationGroupId: Scalars['Int']['input'];
  toStationGroupId: Scalars['Int']['input'];
}>;

export type GetConnectedRoutesQuery = {
  connectedRoutes: Array<{
    __typename: 'Route';
    id: number | null | undefined;
    stops:
      | Array<{
          __typename: 'Station';
          id: number | null | undefined;
          groupId: number | null | undefined;
          name: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameChinese: string | null | undefined;
          nameKorean: string | null | undefined;
          threeLetterCode: string | null | undefined;
          latitude: number | null | undefined;
          longitude: number | null | undefined;
          address: string | null | undefined;
          postalCode: string | null | undefined;
          prefectureId: number | null | undefined;
          openedAt: string | null | undefined;
          closedAt: string | null | undefined;
          status: OperationStatus | null | undefined;
          distance: number | null | undefined;
          hasTrainTypes: boolean | null | undefined;
          stopCondition: StopCondition | null | undefined;
          lines:
            | Array<{
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }>
            | null
            | undefined;
          stationNumbers:
            | Array<{
                __typename: 'StationNumber';
                lineSymbol: string | null | undefined;
                lineSymbolColor: string | null | undefined;
                lineSymbolShape: string | null | undefined;
                stationNumber: string | null | undefined;
              }>
            | null
            | undefined;
          line:
            | {
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }
            | null
            | undefined;
          trainType:
            | {
                __typename: 'TrainType';
                id: number | null | undefined;
                typeId: number | null | undefined;
                groupId: number | null | undefined;
                name: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameChinese: string | null | undefined;
                nameKorean: string | null | undefined;
                color: string | null | undefined;
                direction: TrainDirection | null | undefined;
                kind: TrainTypeKind | null | undefined;
                lines:
                  | Array<{
                      __typename: 'Line';
                      id: number | null | undefined;
                      averageDistance: number | null | undefined;
                      color: string | null | undefined;
                      lineType: LineType | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameRoman: string | null | undefined;
                      nameShort: string | null | undefined;
                      status: OperationStatus | null | undefined;
                      company:
                        | {
                            __typename: 'Company';
                            id: number | null | undefined;
                            name: string | null | undefined;
                            nameEnglishFull: string | null | undefined;
                            nameEnglishShort: string | null | undefined;
                            nameFull: string | null | undefined;
                            nameKatakana: string | null | undefined;
                            nameShort: string | null | undefined;
                            railroadId: number | null | undefined;
                            status: OperationStatus | null | undefined;
                            type: CompanyType | null | undefined;
                            url: string | null | undefined;
                          }
                        | null
                        | undefined;
                      lineSymbols:
                        | Array<{
                            __typename: 'LineSymbol';
                            color: string | null | undefined;
                            shape: string | null | undefined;
                            symbol: string | null | undefined;
                          }>
                        | null
                        | undefined;
                    }>
                  | null
                  | undefined;
                line:
                  | {
                      __typename: 'Line';
                      id: number | null | undefined;
                      averageDistance: number | null | undefined;
                      color: string | null | undefined;
                      lineType: LineType | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameRoman: string | null | undefined;
                      nameShort: string | null | undefined;
                      status: OperationStatus | null | undefined;
                      company:
                        | {
                            __typename: 'Company';
                            id: number | null | undefined;
                            name: string | null | undefined;
                            nameEnglishFull: string | null | undefined;
                            nameEnglishShort: string | null | undefined;
                            nameFull: string | null | undefined;
                            nameKatakana: string | null | undefined;
                            nameShort: string | null | undefined;
                            railroadId: number | null | undefined;
                            status: OperationStatus | null | undefined;
                            type: CompanyType | null | undefined;
                            url: string | null | undefined;
                          }
                        | null
                        | undefined;
                      lineSymbols:
                        | Array<{
                            __typename: 'LineSymbol';
                            color: string | null | undefined;
                            shape: string | null | undefined;
                            symbol: string | null | undefined;
                          }>
                        | null
                        | undefined;
                    }
                  | null
                  | undefined;
              }
            | null
            | undefined;
        }>
      | null
      | undefined;
  }>;
};

export type GetRouteTypesQueryVariables = Exact<{
  fromStationGroupId: Scalars['Int']['input'];
  toStationGroupId: Scalars['Int']['input'];
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pageToken?: InputMaybe<Scalars['String']['input']>;
}>;

export type GetRouteTypesQuery = {
  routeTypes: {
    __typename: 'RouteTypePage';
    nextPageToken: string | null | undefined;
    trainTypes:
      | Array<{
          __typename: 'TrainType';
          id: number | null | undefined;
          typeId: number | null | undefined;
          groupId: number | null | undefined;
          name: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameChinese: string | null | undefined;
          nameKorean: string | null | undefined;
          color: string | null | undefined;
          direction: TrainDirection | null | undefined;
          kind: TrainTypeKind | null | undefined;
          line:
            | {
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }
            | null
            | undefined;
          lines:
            | Array<{
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }>
            | null
            | undefined;
        }>
      | null
      | undefined;
  };
};

export type GetStationQueryVariables = Exact<{
  id: Scalars['Int']['input'];
}>;

export type GetStationQuery = {
  station:
    | {
        __typename: 'Station';
        id: number | null | undefined;
        groupId: number | null | undefined;
        name: string | null | undefined;
        nameKatakana: string | null | undefined;
        nameRoman: string | null | undefined;
        nameChinese: string | null | undefined;
        nameKorean: string | null | undefined;
        threeLetterCode: string | null | undefined;
        latitude: number | null | undefined;
        longitude: number | null | undefined;
        address: string | null | undefined;
        postalCode: string | null | undefined;
        prefectureId: number | null | undefined;
        openedAt: string | null | undefined;
        closedAt: string | null | undefined;
        status: OperationStatus | null | undefined;
        distance: number | null | undefined;
        hasTrainTypes: boolean | null | undefined;
        stopCondition: StopCondition | null | undefined;
        lines:
          | Array<{
              __typename: 'Line';
              id: number | null | undefined;
              averageDistance: number | null | undefined;
              color: string | null | undefined;
              lineType: LineType | null | undefined;
              nameFull: string | null | undefined;
              nameKatakana: string | null | undefined;
              nameRoman: string | null | undefined;
              nameShort: string | null | undefined;
              status: OperationStatus | null | undefined;
              company:
                | {
                    __typename: 'Company';
                    id: number | null | undefined;
                    name: string | null | undefined;
                    nameEnglishFull: string | null | undefined;
                    nameEnglishShort: string | null | undefined;
                    nameFull: string | null | undefined;
                    nameKatakana: string | null | undefined;
                    nameShort: string | null | undefined;
                    railroadId: number | null | undefined;
                    status: OperationStatus | null | undefined;
                    type: CompanyType | null | undefined;
                    url: string | null | undefined;
                  }
                | null
                | undefined;
              lineSymbols:
                | Array<{
                    __typename: 'LineSymbol';
                    color: string | null | undefined;
                    shape: string | null | undefined;
                    symbol: string | null | undefined;
                  }>
                | null
                | undefined;
            }>
          | null
          | undefined;
        stationNumbers:
          | Array<{
              __typename: 'StationNumber';
              lineSymbol: string | null | undefined;
              lineSymbolColor: string | null | undefined;
              lineSymbolShape: string | null | undefined;
              stationNumber: string | null | undefined;
            }>
          | null
          | undefined;
        line:
          | {
              __typename: 'Line';
              id: number | null | undefined;
              averageDistance: number | null | undefined;
              color: string | null | undefined;
              lineType: LineType | null | undefined;
              nameFull: string | null | undefined;
              nameKatakana: string | null | undefined;
              nameRoman: string | null | undefined;
              nameShort: string | null | undefined;
              status: OperationStatus | null | undefined;
              company:
                | {
                    __typename: 'Company';
                    id: number | null | undefined;
                    name: string | null | undefined;
                    nameEnglishFull: string | null | undefined;
                    nameEnglishShort: string | null | undefined;
                    nameFull: string | null | undefined;
                    nameKatakana: string | null | undefined;
                    nameShort: string | null | undefined;
                    railroadId: number | null | undefined;
                    status: OperationStatus | null | undefined;
                    type: CompanyType | null | undefined;
                    url: string | null | undefined;
                  }
                | null
                | undefined;
              lineSymbols:
                | Array<{
                    __typename: 'LineSymbol';
                    color: string | null | undefined;
                    shape: string | null | undefined;
                    symbol: string | null | undefined;
                  }>
                | null
                | undefined;
            }
          | null
          | undefined;
        trainType:
          | {
              __typename: 'TrainType';
              id: number | null | undefined;
              typeId: number | null | undefined;
              groupId: number | null | undefined;
              name: string | null | undefined;
              nameKatakana: string | null | undefined;
              nameRoman: string | null | undefined;
              nameChinese: string | null | undefined;
              nameKorean: string | null | undefined;
              color: string | null | undefined;
              direction: TrainDirection | null | undefined;
              kind: TrainTypeKind | null | undefined;
              lines:
                | Array<{
                    __typename: 'Line';
                    id: number | null | undefined;
                    averageDistance: number | null | undefined;
                    color: string | null | undefined;
                    lineType: LineType | null | undefined;
                    nameFull: string | null | undefined;
                    nameKatakana: string | null | undefined;
                    nameRoman: string | null | undefined;
                    nameShort: string | null | undefined;
                    status: OperationStatus | null | undefined;
                    company:
                      | {
                          __typename: 'Company';
                          id: number | null | undefined;
                          name: string | null | undefined;
                          nameEnglishFull: string | null | undefined;
                          nameEnglishShort: string | null | undefined;
                          nameFull: string | null | undefined;
                          nameKatakana: string | null | undefined;
                          nameShort: string | null | undefined;
                          railroadId: number | null | undefined;
                          status: OperationStatus | null | undefined;
                          type: CompanyType | null | undefined;
                          url: string | null | undefined;
                        }
                      | null
                      | undefined;
                    lineSymbols:
                      | Array<{
                          __typename: 'LineSymbol';
                          color: string | null | undefined;
                          shape: string | null | undefined;
                          symbol: string | null | undefined;
                        }>
                      | null
                      | undefined;
                  }>
                | null
                | undefined;
              line:
                | {
                    __typename: 'Line';
                    id: number | null | undefined;
                    averageDistance: number | null | undefined;
                    color: string | null | undefined;
                    lineType: LineType | null | undefined;
                    nameFull: string | null | undefined;
                    nameKatakana: string | null | undefined;
                    nameRoman: string | null | undefined;
                    nameShort: string | null | undefined;
                    status: OperationStatus | null | undefined;
                    company:
                      | {
                          __typename: 'Company';
                          id: number | null | undefined;
                          name: string | null | undefined;
                          nameEnglishFull: string | null | undefined;
                          nameEnglishShort: string | null | undefined;
                          nameFull: string | null | undefined;
                          nameKatakana: string | null | undefined;
                          nameShort: string | null | undefined;
                          railroadId: number | null | undefined;
                          status: OperationStatus | null | undefined;
                          type: CompanyType | null | undefined;
                          url: string | null | undefined;
                        }
                      | null
                      | undefined;
                    lineSymbols:
                      | Array<{
                          __typename: 'LineSymbol';
                          color: string | null | undefined;
                          shape: string | null | undefined;
                          symbol: string | null | undefined;
                        }>
                      | null
                      | undefined;
                  }
                | null
                | undefined;
            }
          | null
          | undefined;
      }
    | null
    | undefined;
};

export type GetLineQueryVariables = Exact<{
  lineId: Scalars['Int']['input'];
}>;

export type GetLineQuery = {
  line:
    | {
        __typename: 'Line';
        id: number | null | undefined;
        averageDistance: number | null | undefined;
        color: string | null | undefined;
        lineType: LineType | null | undefined;
        nameFull: string | null | undefined;
        nameKatakana: string | null | undefined;
        nameRoman: string | null | undefined;
        nameShort: string | null | undefined;
        status: OperationStatus | null | undefined;
        station:
          | {
              __typename: 'Station';
              id: number | null | undefined;
              groupId: number | null | undefined;
              name: string | null | undefined;
              nameKatakana: string | null | undefined;
              nameRoman: string | null | undefined;
              nameChinese: string | null | undefined;
              nameKorean: string | null | undefined;
              threeLetterCode: string | null | undefined;
              latitude: number | null | undefined;
              longitude: number | null | undefined;
              address: string | null | undefined;
              postalCode: string | null | undefined;
              prefectureId: number | null | undefined;
              openedAt: string | null | undefined;
              closedAt: string | null | undefined;
              status: OperationStatus | null | undefined;
              distance: number | null | undefined;
              hasTrainTypes: boolean | null | undefined;
              stopCondition: StopCondition | null | undefined;
              stationNumbers:
                | Array<{
                    __typename: 'StationNumber';
                    lineSymbol: string | null | undefined;
                    lineSymbolColor: string | null | undefined;
                    lineSymbolShape: string | null | undefined;
                    stationNumber: string | null | undefined;
                  }>
                | null
                | undefined;
              line:
                | {
                    __typename: 'Line';
                    id: number | null | undefined;
                    averageDistance: number | null | undefined;
                    color: string | null | undefined;
                    lineType: LineType | null | undefined;
                    nameFull: string | null | undefined;
                    nameKatakana: string | null | undefined;
                    nameRoman: string | null | undefined;
                    nameShort: string | null | undefined;
                    status: OperationStatus | null | undefined;
                    company:
                      | {
                          __typename: 'Company';
                          id: number | null | undefined;
                          name: string | null | undefined;
                          nameEnglishFull: string | null | undefined;
                          nameEnglishShort: string | null | undefined;
                          nameFull: string | null | undefined;
                          nameKatakana: string | null | undefined;
                          nameShort: string | null | undefined;
                          railroadId: number | null | undefined;
                          status: OperationStatus | null | undefined;
                          type: CompanyType | null | undefined;
                          url: string | null | undefined;
                        }
                      | null
                      | undefined;
                    lineSymbols:
                      | Array<{
                          __typename: 'LineSymbol';
                          color: string | null | undefined;
                          shape: string | null | undefined;
                          symbol: string | null | undefined;
                        }>
                      | null
                      | undefined;
                  }
                | null
                | undefined;
              trainType:
                | {
                    __typename: 'TrainType';
                    id: number | null | undefined;
                    typeId: number | null | undefined;
                    groupId: number | null | undefined;
                    name: string | null | undefined;
                    nameKatakana: string | null | undefined;
                    nameRoman: string | null | undefined;
                    nameChinese: string | null | undefined;
                    nameKorean: string | null | undefined;
                    color: string | null | undefined;
                    direction: TrainDirection | null | undefined;
                    kind: TrainTypeKind | null | undefined;
                    lines:
                      | Array<{
                          __typename: 'Line';
                          id: number | null | undefined;
                          averageDistance: number | null | undefined;
                          color: string | null | undefined;
                          lineType: LineType | null | undefined;
                          nameFull: string | null | undefined;
                          nameKatakana: string | null | undefined;
                          nameRoman: string | null | undefined;
                          nameShort: string | null | undefined;
                          status: OperationStatus | null | undefined;
                          company:
                            | {
                                __typename: 'Company';
                                id: number | null | undefined;
                                name: string | null | undefined;
                                nameEnglishFull: string | null | undefined;
                                nameEnglishShort: string | null | undefined;
                                nameFull: string | null | undefined;
                                nameKatakana: string | null | undefined;
                                nameShort: string | null | undefined;
                                railroadId: number | null | undefined;
                                status: OperationStatus | null | undefined;
                                type: CompanyType | null | undefined;
                                url: string | null | undefined;
                              }
                            | null
                            | undefined;
                          lineSymbols:
                            | Array<{
                                __typename: 'LineSymbol';
                                color: string | null | undefined;
                                shape: string | null | undefined;
                                symbol: string | null | undefined;
                              }>
                            | null
                            | undefined;
                        }>
                      | null
                      | undefined;
                    line:
                      | {
                          __typename: 'Line';
                          id: number | null | undefined;
                          averageDistance: number | null | undefined;
                          color: string | null | undefined;
                          lineType: LineType | null | undefined;
                          nameFull: string | null | undefined;
                          nameKatakana: string | null | undefined;
                          nameRoman: string | null | undefined;
                          nameShort: string | null | undefined;
                          status: OperationStatus | null | undefined;
                          company:
                            | {
                                __typename: 'Company';
                                id: number | null | undefined;
                                name: string | null | undefined;
                                nameEnglishFull: string | null | undefined;
                                nameEnglishShort: string | null | undefined;
                                nameFull: string | null | undefined;
                                nameKatakana: string | null | undefined;
                                nameShort: string | null | undefined;
                                railroadId: number | null | undefined;
                                status: OperationStatus | null | undefined;
                                type: CompanyType | null | undefined;
                                url: string | null | undefined;
                              }
                            | null
                            | undefined;
                          lineSymbols:
                            | Array<{
                                __typename: 'LineSymbol';
                                color: string | null | undefined;
                                shape: string | null | undefined;
                                symbol: string | null | undefined;
                              }>
                            | null
                            | undefined;
                        }
                      | null
                      | undefined;
                  }
                | null
                | undefined;
            }
          | null
          | undefined;
        trainType:
          | {
              __typename: 'TrainType';
              id: number | null | undefined;
              typeId: number | null | undefined;
              groupId: number | null | undefined;
              name: string | null | undefined;
              nameKatakana: string | null | undefined;
              nameRoman: string | null | undefined;
              nameChinese: string | null | undefined;
              nameKorean: string | null | undefined;
              color: string | null | undefined;
              direction: TrainDirection | null | undefined;
              kind: TrainTypeKind | null | undefined;
              line:
                | {
                    __typename: 'Line';
                    id: number | null | undefined;
                    averageDistance: number | null | undefined;
                    color: string | null | undefined;
                    lineType: LineType | null | undefined;
                    nameFull: string | null | undefined;
                    nameKatakana: string | null | undefined;
                    nameRoman: string | null | undefined;
                    nameShort: string | null | undefined;
                    status: OperationStatus | null | undefined;
                    company:
                      | {
                          __typename: 'Company';
                          id: number | null | undefined;
                          name: string | null | undefined;
                          nameEnglishFull: string | null | undefined;
                          nameEnglishShort: string | null | undefined;
                          nameFull: string | null | undefined;
                          nameKatakana: string | null | undefined;
                          nameShort: string | null | undefined;
                          railroadId: number | null | undefined;
                          status: OperationStatus | null | undefined;
                          type: CompanyType | null | undefined;
                          url: string | null | undefined;
                        }
                      | null
                      | undefined;
                    lineSymbols:
                      | Array<{
                          __typename: 'LineSymbol';
                          color: string | null | undefined;
                          shape: string | null | undefined;
                          symbol: string | null | undefined;
                        }>
                      | null
                      | undefined;
                  }
                | null
                | undefined;
              lines:
                | Array<{
                    __typename: 'Line';
                    id: number | null | undefined;
                    averageDistance: number | null | undefined;
                    color: string | null | undefined;
                    lineType: LineType | null | undefined;
                    nameFull: string | null | undefined;
                    nameKatakana: string | null | undefined;
                    nameRoman: string | null | undefined;
                    nameShort: string | null | undefined;
                    status: OperationStatus | null | undefined;
                    company:
                      | {
                          __typename: 'Company';
                          id: number | null | undefined;
                          name: string | null | undefined;
                          nameEnglishFull: string | null | undefined;
                          nameEnglishShort: string | null | undefined;
                          nameFull: string | null | undefined;
                          nameKatakana: string | null | undefined;
                          nameShort: string | null | undefined;
                          railroadId: number | null | undefined;
                          status: OperationStatus | null | undefined;
                          type: CompanyType | null | undefined;
                          url: string | null | undefined;
                        }
                      | null
                      | undefined;
                    lineSymbols:
                      | Array<{
                          __typename: 'LineSymbol';
                          color: string | null | undefined;
                          shape: string | null | undefined;
                          symbol: string | null | undefined;
                        }>
                      | null
                      | undefined;
                  }>
                | null
                | undefined;
            }
          | null
          | undefined;
        company:
          | {
              __typename: 'Company';
              id: number | null | undefined;
              name: string | null | undefined;
              nameEnglishFull: string | null | undefined;
              nameEnglishShort: string | null | undefined;
              nameFull: string | null | undefined;
              nameKatakana: string | null | undefined;
              nameShort: string | null | undefined;
              railroadId: number | null | undefined;
              status: OperationStatus | null | undefined;
              type: CompanyType | null | undefined;
              url: string | null | undefined;
            }
          | null
          | undefined;
        lineSymbols:
          | Array<{
              __typename: 'LineSymbol';
              color: string | null | undefined;
              shape: string | null | undefined;
              symbol: string | null | undefined;
            }>
          | null
          | undefined;
      }
    | null
    | undefined;
};

export type GetLinesByNameQueryVariables = Exact<{
  name: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetLinesByNameQuery = {
  linesByName: Array<{
    __typename: 'Line';
    id: number | null | undefined;
    averageDistance: number | null | undefined;
    color: string | null | undefined;
    lineType: LineType | null | undefined;
    nameFull: string | null | undefined;
    nameKatakana: string | null | undefined;
    nameRoman: string | null | undefined;
    nameShort: string | null | undefined;
    status: OperationStatus | null | undefined;
    station:
      | {
          __typename: 'Station';
          id: number | null | undefined;
          groupId: number | null | undefined;
          name: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameChinese: string | null | undefined;
          nameKorean: string | null | undefined;
          threeLetterCode: string | null | undefined;
          latitude: number | null | undefined;
          longitude: number | null | undefined;
          address: string | null | undefined;
          postalCode: string | null | undefined;
          prefectureId: number | null | undefined;
          openedAt: string | null | undefined;
          closedAt: string | null | undefined;
          status: OperationStatus | null | undefined;
          distance: number | null | undefined;
          hasTrainTypes: boolean | null | undefined;
          stopCondition: StopCondition | null | undefined;
          stationNumbers:
            | Array<{
                __typename: 'StationNumber';
                lineSymbol: string | null | undefined;
                lineSymbolColor: string | null | undefined;
                lineSymbolShape: string | null | undefined;
                stationNumber: string | null | undefined;
              }>
            | null
            | undefined;
          line:
            | {
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }
            | null
            | undefined;
          trainType:
            | {
                __typename: 'TrainType';
                id: number | null | undefined;
                typeId: number | null | undefined;
                groupId: number | null | undefined;
                name: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameChinese: string | null | undefined;
                nameKorean: string | null | undefined;
                color: string | null | undefined;
                direction: TrainDirection | null | undefined;
                kind: TrainTypeKind | null | undefined;
                lines:
                  | Array<{
                      __typename: 'Line';
                      id: number | null | undefined;
                      averageDistance: number | null | undefined;
                      color: string | null | undefined;
                      lineType: LineType | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameRoman: string | null | undefined;
                      nameShort: string | null | undefined;
                      status: OperationStatus | null | undefined;
                      company:
                        | {
                            __typename: 'Company';
                            id: number | null | undefined;
                            name: string | null | undefined;
                            nameEnglishFull: string | null | undefined;
                            nameEnglishShort: string | null | undefined;
                            nameFull: string | null | undefined;
                            nameKatakana: string | null | undefined;
                            nameShort: string | null | undefined;
                            railroadId: number | null | undefined;
                            status: OperationStatus | null | undefined;
                            type: CompanyType | null | undefined;
                            url: string | null | undefined;
                          }
                        | null
                        | undefined;
                      lineSymbols:
                        | Array<{
                            __typename: 'LineSymbol';
                            color: string | null | undefined;
                            shape: string | null | undefined;
                            symbol: string | null | undefined;
                          }>
                        | null
                        | undefined;
                    }>
                  | null
                  | undefined;
                line:
                  | {
                      __typename: 'Line';
                      id: number | null | undefined;
                      averageDistance: number | null | undefined;
                      color: string | null | undefined;
                      lineType: LineType | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameRoman: string | null | undefined;
                      nameShort: string | null | undefined;
                      status: OperationStatus | null | undefined;
                      company:
                        | {
                            __typename: 'Company';
                            id: number | null | undefined;
                            name: string | null | undefined;
                            nameEnglishFull: string | null | undefined;
                            nameEnglishShort: string | null | undefined;
                            nameFull: string | null | undefined;
                            nameKatakana: string | null | undefined;
                            nameShort: string | null | undefined;
                            railroadId: number | null | undefined;
                            status: OperationStatus | null | undefined;
                            type: CompanyType | null | undefined;
                            url: string | null | undefined;
                          }
                        | null
                        | undefined;
                      lineSymbols:
                        | Array<{
                            __typename: 'LineSymbol';
                            color: string | null | undefined;
                            shape: string | null | undefined;
                            symbol: string | null | undefined;
                          }>
                        | null
                        | undefined;
                    }
                  | null
                  | undefined;
              }
            | null
            | undefined;
        }
      | null
      | undefined;
    trainType:
      | {
          __typename: 'TrainType';
          id: number | null | undefined;
          typeId: number | null | undefined;
          groupId: number | null | undefined;
          name: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameChinese: string | null | undefined;
          nameKorean: string | null | undefined;
          color: string | null | undefined;
          direction: TrainDirection | null | undefined;
          kind: TrainTypeKind | null | undefined;
          line:
            | {
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }
            | null
            | undefined;
          lines:
            | Array<{
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }>
            | null
            | undefined;
        }
      | null
      | undefined;
    company:
      | {
          __typename: 'Company';
          id: number | null | undefined;
          name: string | null | undefined;
          nameEnglishFull: string | null | undefined;
          nameEnglishShort: string | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameShort: string | null | undefined;
          railroadId: number | null | undefined;
          status: OperationStatus | null | undefined;
          type: CompanyType | null | undefined;
          url: string | null | undefined;
        }
      | null
      | undefined;
    lineSymbols:
      | Array<{
          __typename: 'LineSymbol';
          color: string | null | undefined;
          shape: string | null | undefined;
          symbol: string | null | undefined;
        }>
      | null
      | undefined;
  }>;
};

export type GetStationGroupStationsQueryVariables = Exact<{
  groupId: Scalars['Int']['input'];
}>;

export type GetStationGroupStationsQuery = {
  stationGroupStations: Array<{
    __typename: 'Station';
    id: number | null | undefined;
    groupId: number | null | undefined;
    name: string | null | undefined;
    nameKatakana: string | null | undefined;
    nameRoman: string | null | undefined;
    nameChinese: string | null | undefined;
    nameKorean: string | null | undefined;
    threeLetterCode: string | null | undefined;
    latitude: number | null | undefined;
    longitude: number | null | undefined;
    address: string | null | undefined;
    postalCode: string | null | undefined;
    prefectureId: number | null | undefined;
    openedAt: string | null | undefined;
    closedAt: string | null | undefined;
    status: OperationStatus | null | undefined;
    distance: number | null | undefined;
    hasTrainTypes: boolean | null | undefined;
    stopCondition: StopCondition | null | undefined;
    lines:
      | Array<{
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }>
      | null
      | undefined;
    stationNumbers:
      | Array<{
          __typename: 'StationNumber';
          lineSymbol: string | null | undefined;
          lineSymbolColor: string | null | undefined;
          lineSymbolShape: string | null | undefined;
          stationNumber: string | null | undefined;
        }>
      | null
      | undefined;
    line:
      | {
          __typename: 'Line';
          id: number | null | undefined;
          averageDistance: number | null | undefined;
          color: string | null | undefined;
          lineType: LineType | null | undefined;
          nameFull: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameShort: string | null | undefined;
          status: OperationStatus | null | undefined;
          company:
            | {
                __typename: 'Company';
                id: number | null | undefined;
                name: string | null | undefined;
                nameEnglishFull: string | null | undefined;
                nameEnglishShort: string | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameShort: string | null | undefined;
                railroadId: number | null | undefined;
                status: OperationStatus | null | undefined;
                type: CompanyType | null | undefined;
                url: string | null | undefined;
              }
            | null
            | undefined;
          lineSymbols:
            | Array<{
                __typename: 'LineSymbol';
                color: string | null | undefined;
                shape: string | null | undefined;
                symbol: string | null | undefined;
              }>
            | null
            | undefined;
        }
      | null
      | undefined;
    trainType:
      | {
          __typename: 'TrainType';
          id: number | null | undefined;
          typeId: number | null | undefined;
          groupId: number | null | undefined;
          name: string | null | undefined;
          nameKatakana: string | null | undefined;
          nameRoman: string | null | undefined;
          nameChinese: string | null | undefined;
          nameKorean: string | null | undefined;
          color: string | null | undefined;
          direction: TrainDirection | null | undefined;
          kind: TrainTypeKind | null | undefined;
          lines:
            | Array<{
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }>
            | null
            | undefined;
          line:
            | {
                __typename: 'Line';
                id: number | null | undefined;
                averageDistance: number | null | undefined;
                color: string | null | undefined;
                lineType: LineType | null | undefined;
                nameFull: string | null | undefined;
                nameKatakana: string | null | undefined;
                nameRoman: string | null | undefined;
                nameShort: string | null | undefined;
                status: OperationStatus | null | undefined;
                company:
                  | {
                      __typename: 'Company';
                      id: number | null | undefined;
                      name: string | null | undefined;
                      nameEnglishFull: string | null | undefined;
                      nameEnglishShort: string | null | undefined;
                      nameFull: string | null | undefined;
                      nameKatakana: string | null | undefined;
                      nameShort: string | null | undefined;
                      railroadId: number | null | undefined;
                      status: OperationStatus | null | undefined;
                      type: CompanyType | null | undefined;
                      url: string | null | undefined;
                    }
                  | null
                  | undefined;
                lineSymbols:
                  | Array<{
                      __typename: 'LineSymbol';
                      color: string | null | undefined;
                      shape: string | null | undefined;
                      symbol: string | null | undefined;
                    }>
                  | null
                  | undefined;
              }
            | null
            | undefined;
        }
      | null
      | undefined;
  }>;
};
