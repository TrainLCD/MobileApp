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

// Lightweight fragment for preset cards (PresetCard + useBounds display only)
export const STATION_PRESET_FRAGMENT = gql`
  ${LINE_SYMBOL_FRAGMENT}
  ${STATION_NUMBER_FRAGMENT}
  fragment StationPresetFields on Station {
    id
    groupId
    name
    nameRoman
    stationNumbers {
      ...StationNumberFields
    }
    trainType {
      groupId
      kind
      name
      nameRoman
    }
    line {
      id
      color
      lineType
      nameShort
      nameFull
      nameRoman
      lineSymbols {
        ...LineSymbolFields
      }
      station {
        id
        stationNumbers {
          lineSymbol
          stationNumber
        }
      }
      company {
        id
      }
    }
  }
`;

// Query for getting stations by multiple line IDs (lightweight, for preset cards)
export const GET_LINE_LIST_STATIONS_PRESET = gql`
  ${STATION_PRESET_FRAGMENT}
  query GetLineListStationsPreset($lineIds: [Int!]!) {
    lineListStations(lineIds: $lineIds) {
      ...StationPresetFields
    }
  }
`;

// Query for getting stations by multiple line group IDs (lightweight, for preset cards)
export const GET_LINE_GROUP_LIST_STATIONS_PRESET = gql`
  ${STATION_PRESET_FRAGMENT}
  query GetLineGroupListStationsPreset($lineGroupIds: [Int!]!) {
    lineGroupListStations(lineGroupIds: $lineGroupIds) {
      ...StationPresetFields
    }
  }
`;

// Lightweight fragment for station cache (bounds display only)
export const STATION_LIGHT_FRAGMENT = gql`
  fragment StationLightFields on Station {
    id
    groupId
    name
    nameRoman
    nameChinese
    nameKorean
    line {
      id
    }
  }
`;

// Query for getting stations by multiple line IDs (lightweight, for line card bounds)
export const GET_LINE_LIST_STATIONS_LIGHT = gql`
  ${STATION_LIGHT_FRAGMENT}
  query GetLineListStationsLight($lineIds: [Int!]!) {
    lineListStations(lineIds: $lineIds) {
      ...StationLightFields
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

// Lightweight fragment for route/train-type selection (TrainTypeListModal + computeCurrentStationInRoutes)
export const LINE_ROUTE_FRAGMENT = gql`
  fragment LineRouteFields on LineNested {
    id
    nameShort
    nameRoman
    trainType {
      typeId
      name
      nameRoman
    }
    company {
      id
      nameShort
      nameEnglishShort
    }
  }
`;

export const TRAIN_TYPE_ROUTE_FRAGMENT = gql`
  ${LINE_ROUTE_FRAGMENT}
  fragment TrainTypeRouteFields on TrainType {
    id
    typeId
    groupId
    name
    nameRoman
    kind
    line {
      ...LineRouteFields
    }
    lines {
      ...LineRouteFields
    }
  }
`;

// Query for getting route types (lightweight)
export const GET_ROUTE_TYPES_LIGHT = gql`
  ${TRAIN_TYPE_ROUTE_FRAGMENT}
  query GetRouteTypesLight(
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
        ...TrainTypeRouteFields
      }
    }
  }
`;

// Query for getting train types by station ID (lightweight)
export const GET_STATION_TRAIN_TYPES_LIGHT = gql`
  ${TRAIN_TYPE_ROUTE_FRAGMENT}
  query GetStationTrainTypesLight($stationId: Int!) {
    stationTrainTypes(stationId: $stationId) {
      ...TrainTypeRouteFields
    }
  }
`;
