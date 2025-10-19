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

export const TRAIN_TYPE_FRAGMENT = gql`
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
  }
`;

export const LINE_FRAGMENT = gql`
  ${COMPANY_FRAGMENT}
  ${LINE_SYMBOL_FRAGMENT}
  fragment LineFields on Line {
    id
    averageDistance
    color
    company {
      ...CompanyFields
    }
    lineSymbols {
      ...LineSymbolFields
    }
    lineType
    nameFull
    nameKatakana
    nameRoman
    nameShort
    status
  }
`;

export const STATION_FRAGMENT = gql`
  ${LINE_FRAGMENT}
  ${STATION_NUMBER_FRAGMENT}
  ${TRAIN_TYPE_FRAGMENT}
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
    stationNumbers {
      ...StationNumberFields
    }
    line {
      ...LineFields
    }
    trainType {
      ...TrainTypeFields
    }
  }
`;

// Query for getting stations by coordinates (nearby stations)
export const GET_STATIONS_NEARBY = gql`
  ${STATION_FRAGMENT}
  query GetStationsNearby($latitude: Float!, $longitude: Float!, $limit: Int) {
    stationsNearby(latitude: $latitude, longitude: $longitude, limit: $limit) {
      ...StationFields
      lines {
        ...LineFields
      }
    }
  }
`;

// Query for getting stations by line ID
export const GET_LINE_STATIONS = gql`
  ${STATION_FRAGMENT}
  query GetLineStations($lineId: Int!, $stationId: Int) {
    lineStations(lineId: $lineId, stationId: $stationId) {
      ...StationFields
      lines {
        ...LineFields
      }
    }
  }
`;

// Query for getting stations by name
export const GET_STATIONS_BY_NAME = gql`
  ${STATION_FRAGMENT}
  query GetStationsByName($name: String!, $limit: Int, $fromStationGroupId: Int) {
    stationsByName(name: $name, limit: $limit, fromStationGroupId: $fromStationGroupId) {
      ...StationFields
      lines {
        ...LineFields
      }
    }
  }
`;

// Query for getting stations by line group ID (train type group)
export const GET_LINE_GROUP_STATIONS = gql`
  ${STATION_FRAGMENT}
  query GetLineGroupStations($lineGroupId: Int!) {
    lineGroupStations(lineGroupId: $lineGroupId) {
      ...StationFields
      lines {
        ...LineFields
      }
    }
  }
`;

// Query for getting train types by station ID
export const GET_STATION_TRAIN_TYPES = gql`
  ${TRAIN_TYPE_FRAGMENT}
  ${LINE_FRAGMENT}
  query GetStationTrainTypes($stationId: Int!) {
    stationTrainTypes(stationId: $stationId) {
      ...TrainTypeFields
      line {
        ...LineFields
      }
      lines {
        ...LineFields
      }
    }
  }
`;

// Query for getting stations by ID list
export const GET_STATIONS = gql`
  ${STATION_FRAGMENT}
  query GetStations($ids: [Int!]!) {
    stations(ids: $ids) {
      ...StationFields
      lines {
        ...LineFields
      }
    }
  }
`;

// Query for getting routes between two stations
export const GET_ROUTES = gql`
  ${STATION_FRAGMENT}
  query GetRoutes($fromStationGroupId: Int!, $toStationGroupId: Int!, $pageSize: Int, $pageToken: String) {
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
          ...StationFields
          lines {
            ...LineFields
          }
        }
      }
    }
  }
`;

// Query for getting connected routes
export const GET_CONNECTED_ROUTES = gql`
  ${STATION_FRAGMENT}
  query GetConnectedRoutes($fromStationGroupId: Int!, $toStationGroupId: Int!) {
    connectedRoutes(fromStationGroupId: $fromStationGroupId, toStationGroupId: $toStationGroupId) {
      id
      stops {
        ...StationFields
        lines {
          ...LineFields
        }
      }
    }
  }
`;

// Query for getting route types
export const GET_ROUTE_TYPES = gql`
  ${TRAIN_TYPE_FRAGMENT}
  ${LINE_FRAGMENT}
  query GetRouteTypes($fromStationGroupId: Int!, $toStationGroupId: Int!, $pageSize: Int, $pageToken: String) {
    routeTypes(
      fromStationGroupId: $fromStationGroupId
      toStationGroupId: $toStationGroupId
      pageSize: $pageSize
      pageToken: $pageToken
    ) {
      nextPageToken
      trainTypes {
        ...TrainTypeFields
        line {
          ...LineFields
        }
        lines {
          ...LineFields
        }
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
      lines {
        ...LineFields
      }
    }
  }
`;

// Query for getting line by ID
export const GET_LINE = gql`
  ${LINE_FRAGMENT}
  ${STATION_FRAGMENT}
  ${TRAIN_TYPE_FRAGMENT}
  query GetLine($lineId: Int!) {
    line(lineId: $lineId) {
      ...LineFields
      station {
        ...StationFields
      }
      trainType {
        ...TrainTypeFields
      }
    }
  }
`;

// Query for getting lines by name
export const GET_LINES_BY_NAME = gql`
  ${LINE_FRAGMENT}
  ${STATION_FRAGMENT}
  ${TRAIN_TYPE_FRAGMENT}
  query GetLinesByName($name: String!, $limit: Int) {
    linesByName(name: $name, limit: $limit) {
      ...LineFields
      station {
        ...StationFields
      }
      trainType {
        ...TrainTypeFields
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
      lines {
        ...LineFields
      }
    }
  }
`;
