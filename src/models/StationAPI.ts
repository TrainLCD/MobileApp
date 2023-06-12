import { MarkShape } from '../constants/numbering'
import { StopCondition } from '../gen/stationapi_pb'

export const TRAIN_DIRECTION = {
  BOTH: 'BOTH',
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
} as const

export type TrainDirection =
  (typeof TRAIN_DIRECTION)[keyof typeof TRAIN_DIRECTION]

export interface StationData {
  station: Station
}

export interface StationsByNameData {
  stationsByName: Station[]
}

export interface NearbyStationsData {
  nearbyStations: Station[]
}

export interface StationsByLineIdData {
  stationsByLineId: Station[]
}

export interface LineByIdData {
  line: Line
}

export interface TrainTypeData {
  trainType: APITrainType
}

export interface StationNumber {
  lineSymbol: string
  lineSymbolColor: string
  stationNumber: string
  lineSymbolShape: MarkShape
}

export interface APITrainTypeMinimum {
  id: number
  typeId: number
  groupId: number
  name: string
  nameK: string
  nameR: string
  nameZh: string
  nameKo: string
  color: string
  line: Line
}
export interface APITrainType {
  id: number
  typeId: number
  groupId: number
  name: string
  nameK: string
  nameR: string
  nameZh: string
  nameKo: string
  stations: Station[]
  color: string
  allTrainTypes: APITrainTypeMinimum[]
  direction: TrainDirection
  lines: Line[]
}

export interface Station {
  id: number
  groupId: number
  prefId: number
  name: string
  nameK: string
  nameR: string
  nameZh: string
  nameKo: string
  nameForSearch?: string
  nameForSearchR?: string
  address: string
  currentLine: Line
  lines: Line[]
  latitude: number
  longitude: number
  distance?: number
  trainTypes: APITrainType[]
  stopCondition: StopCondition
  stationNumbers: StationNumber[]
  threeLetterCode: string
  __typename: 'Station'
}

export const LINE_TYPE = {
  OTHER: 0,
  BULLET_TRAIN: 1,
  NORMAL: 2,
  SUBWAY: 3,
  TRAM: 4,
  MONORAIL: 5,
  AGT: 6,
} as const

export type LineType = (typeof LINE_TYPE)[keyof typeof LINE_TYPE]

export interface Company {
  nameR: string
  nameEn: string
}

export interface LineSymbol {
  lineSymbol: string
  lineSymbolColor: string
  stationNumber: string
  lineSymbolShape: MarkShape
}

export interface Line {
  id: number
  companyId: number
  lineColorC: string | null
  name: string
  nameR: string
  nameK: string
  nameZh: string
  nameKo: string
  lineType: LineType
  lineSymbols: LineSymbol[]
  company: Company
  transferStation: Station | null
  __typename: 'Line'
}
