import { gql } from '@apollo/client';

// Fragment definitions for reusability
export const COMPANY_FRAGMENT = gql`
  fragment CompanyFields on Company {
    id
    name
    nameEnglishFull
    nameEnglishShort
    nameFull
    nameKatakana
    nameShort
    railroadId
    status
    type
    url
  }
`;

export const LINE_SYMBOL_FRAGMENT = gql`
  fragment LineSymbolFields on LineSymbol {
    color
    shape
    symbol
  }
`;

export const STATION_NUMBER_FRAGMENT = gql`
  fragment StationNumberFields on StationNumber {
    lineSymbol
    lineSymbolColor
    lineSymbolShape
    stationNumber
  }
`;

export const LINE_FRAGMENT = gql`
  ${COMPANY_FRAGMENT}
  ${LINE_SYMBOL_FRAGMENT}
  ${STATION_NUMBER_FRAGMENT}
  fragment LineDetailFields on Line {
    id
    averageDistance
    color
    company {
      ...CompanyFields
    }
    lineSymbols {
      ...LineSymbolFields
    }
    station {
      id
      groupId
      name
      nameRoman
      nameChinese
      nameKorean
      hasTrainTypes
      transportType
      stationNumbers {
        ...StationNumberFields
      }
    }
    lineType
    nameFull
    nameKatakana
    nameRoman
    nameShort
    nameChinese
    nameKorean
    status
    transportType
  }
`;

export const LINES_FRAGMENT = gql`
  ${COMPANY_FRAGMENT}
  ${LINE_SYMBOL_FRAGMENT}
  ${STATION_NUMBER_FRAGMENT}
  fragment LineListItemFields on Line {
    id
    averageDistance
    color
    company {
      ...CompanyFields
    }
    lineSymbols {
      ...LineSymbolFields
    }
    station {
      id
      groupId
      name
      nameRoman
      nameChinese
      nameKorean
      hasTrainTypes
      stationNumbers {
        ...StationNumberFields
      }
    }
    lineType
    nameFull
    nameKatakana
    nameRoman
    nameShort
    nameChinese
    nameKorean
    status
  }
`;

export const TINY_TRAIN_TYPE_FRAGMENT = gql`
  fragment TinyTrainTypeFields on TrainTypeNested {
    id
    typeId
    groupId
    name
    nameKatakana
    nameRoman
    nameChinese
    nameKorean
    color
    direction
    kind
  }
`;

export const LINE_NESTED_FRAGMENT = gql`
  ${COMPANY_FRAGMENT}
  ${LINE_SYMBOL_FRAGMENT}
  ${STATION_NUMBER_FRAGMENT}
  ${TINY_TRAIN_TYPE_FRAGMENT}
  fragment LineNestedFields on LineNested {
    id
    averageDistance
    color
    company {
      ...CompanyFields
    }
    lineSymbols {
      ...LineSymbolFields
    }
    station {
      id
      groupId
      name
      nameRoman
      nameChinese
      nameKorean
      hasTrainTypes
      stationNumbers {
        ...StationNumberFields
      }
    }
    trainType {
      ...TinyTrainTypeFields
    }
    lineType
    nameFull
    nameKatakana
    nameRoman
    nameShort
    nameChinese
    nameKorean
    status
    transportType
  }
`;

export const TRAIN_TYPE_FRAGMENT = gql`
  ${LINE_NESTED_FRAGMENT}
  fragment TrainTypeFields on TrainType {
    id
    typeId
    groupId
    name
    nameKatakana
    nameRoman
    nameChinese
    nameKorean
    color
    direction
    kind
    line {
      ...LineNestedFields
    }
    lines {
      ...LineNestedFields
    }
  }
`;

export const TRAIN_TYPE_NESTED_FRAGMENT = gql`
  ${LINE_NESTED_FRAGMENT}
  fragment TrainTypeNestedFields on TrainTypeNested {
    id
    typeId
    groupId
    name
    nameKatakana
    nameRoman
    nameChinese
    nameKorean
    color
    direction
    kind
    line {
      ...LineNestedFields
    }
    lines {
      ...LineNestedFields
    }
  }
`;

export const STATION_FRAGMENT = gql`
  ${LINE_NESTED_FRAGMENT}
  ${STATION_NUMBER_FRAGMENT}
  ${TRAIN_TYPE_NESTED_FRAGMENT}
  fragment StationFields on Station {
    id
    groupId
    name
    nameKatakana
    nameRoman
    nameChinese
    nameKorean
    threeLetterCode
    latitude
    longitude
    address
    postalCode
    prefectureId
    openedAt
    closedAt
    status
    distance
    hasTrainTypes
    stopCondition
    transportType
    stationNumbers {
      ...StationNumberFields
    }
    line {
      ...LineNestedFields
    }
    lines {
      ...LineNestedFields
    }
    trainType {
      ...TrainTypeNestedFields
    }
  }
`;

export const STATION_NESTED_FRAGMENT = gql`
  ${LINE_NESTED_FRAGMENT}
  ${STATION_NUMBER_FRAGMENT}
  ${TRAIN_TYPE_NESTED_FRAGMENT}
  fragment StationNestedFields on StationNested {
    id
    groupId
    name
    nameKatakana
    nameRoman
    nameChinese
    nameKorean
    threeLetterCode
    latitude
    longitude
    address
    postalCode
    prefectureId
    openedAt
    closedAt
    status
    distance
    hasTrainTypes
    stopCondition
    transportType
    stationNumbers {
      ...StationNumberFields
    }
    line {
      ...LineNestedFields
    }
    lines {
      ...LineNestedFields
    }
    trainType {
      ...TrainTypeNestedFields
    }
  }
`;

// Query for getting stations by coordinates (nearby stations)
export const GET_STATIONS_NEARBY = gql`
  ${STATION_FRAGMENT}
  query GetStationsNearby(
    $latitude: Float!
    $longitude: Float!
    $limit: Int
    $transportType: TransportType
  ) {
    stationsNearby(
      latitude: $latitude
      longitude: $longitude
      limit: $limit
      transportType: $transportType
    ) {
      ...StationFields
    }
  }
`;

// Query for getting stations by line ID
export const GET_LINE_STATIONS = gql`
  ${STATION_FRAGMENT}
  query GetLineStations($lineId: Int!, $stationId: Int) {
    lineStations(lineId: $lineId, stationId: $stationId) {
      ...StationFields
    }
  }
`;

// Query for getting stations by name
export const GET_STATIONS_BY_NAME = gql`
  ${STATION_FRAGMENT}
  query GetStationsByName(
    $name: String!
    $limit: Int
    $fromStationGroupId: Int
  ) {
    stationsByName(
      name: $name
      limit: $limit
      fromStationGroupId: $fromStationGroupId
    ) {
      ...StationFields
    }
  }
`;

// Query for getting stations by line group ID (train type group)
export const GET_LINE_GROUP_STATIONS = gql`
  ${STATION_FRAGMENT}
  query GetLineGroupStations($lineGroupId: Int!) {
    lineGroupStations(lineGroupId: $lineGroupId) {
      ...StationFields
    }
  }
`;

// Query for getting train types by station ID
export const GET_STATION_TRAIN_TYPES = gql`
  ${TRAIN_TYPE_FRAGMENT}
  query GetStationTrainTypes($stationId: Int!) {
    stationTrainTypes(stationId: $stationId) {
      ...TrainTypeFields
    }
  }
`;

// Query for getting stations by ID list
export const GET_STATIONS = gql`
  ${STATION_FRAGMENT}
  query GetStations($ids: [Int!]!) {
    stations(ids: $ids) {
      ...StationFields
    }
  }
`;

// Query for getting routes between two stations
export const GET_ROUTES = gql`
  ${STATION_NESTED_FRAGMENT}
  query GetRoutes(
    $fromStationGroupId: Int!
    $toStationGroupId: Int!
    $pageSize: Int
    $pageToken: String
  ) {
    routes(
      fromStationGroupId: $fromStationGroupId
      toStationGroupId: $toStationGroupId
      pageSize: $pageSize
      pageToken: $pageToken
    ) {
      nextPageToken
      routes {
        id
        stops {
          ...StationNestedFields
        }
      }
    }
  }
`;

// Query for getting connected routes
export const GET_CONNECTED_ROUTES = gql`
  ${STATION_NESTED_FRAGMENT}
  query GetConnectedRoutes($fromStationGroupId: Int!, $toStationGroupId: Int!) {
    connectedRoutes(
      fromStationGroupId: $fromStationGroupId
      toStationGroupId: $toStationGroupId
    ) {
      id
      stops {
        ...StationNestedFields
      }
    }
  }
`;

// Query for getting route types
export const GET_ROUTE_TYPES = gql`
  ${TRAIN_TYPE_FRAGMENT}
  query GetRouteTypes(
    $fromStationGroupId: Int!
    $toStationGroupId: Int!
    $pageSize: Int
    $pageToken: String
    $viaLineId: Int
  ) {
    routeTypes(
      fromStationGroupId: $fromStationGroupId
      toStationGroupId: $toStationGroupId
      pageSize: $pageSize
      pageToken: $pageToken
      viaLineId: $viaLineId
    ) {
      nextPageToken
      trainTypes {
        ...TrainTypeFields
      }
    }
  }
`;

// Query for getting station by ID
export const GET_STATION = gql`
  ${STATION_FRAGMENT}
  query GetStation($id: Int!) {
    station(id: $id) {
      ...StationFields
    }
  }
`;

// Query for getting line by ID
export const GET_LINE = gql`
  ${LINE_FRAGMENT}
  ${STATION_NESTED_FRAGMENT}
  ${TRAIN_TYPE_NESTED_FRAGMENT}
  query GetLine($lineId: Int!) {
    line(lineId: $lineId) {
      ...LineDetailFields
      station {
        ...StationNestedFields
      }
      trainType {
        ...TrainTypeNestedFields
      }
    }
  }
`;

// Query for getting lines by name
export const GET_LINES_BY_NAME = gql`
  ${LINE_FRAGMENT}
  ${STATION_NESTED_FRAGMENT}
  ${TRAIN_TYPE_NESTED_FRAGMENT}
  query GetLinesByName($name: String!, $limit: Int) {
    linesByName(name: $name, limit: $limit) {
      ...LineListItemFields
      station {
        ...StationNestedFields
      }
      trainType {
        ...TrainTypeNestedFields
      }
    }
  }
`;

// Query for getting station group stations
export const GET_STATION_GROUP_STATIONS = gql`
  ${STATION_FRAGMENT}
  query GetStationGroupStations($groupId: Int!) {
    stationGroupStations(groupId: $groupId) {
      ...StationFields
    }
  }
`;
