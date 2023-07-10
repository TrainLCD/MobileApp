import range from 'lodash/range'
import { Line, Station } from '../gen/stationapi_pb'
import { LineDirection } from '../models/Bound'
import { TrainTypeString } from '../models/TrainType'

const CHUO_LINE_RAPID_START_ID = 1131201
const CHUO_LINE_RAPID_END_ID = 1131227
const SOBU_LINE_RAPID_START_ID = 1131401
const SOBU_LINE_RAPID_END_ID = 1131410
const JOBAN_LINE_RAPID_START_ID = 1132001
const JOBAN_LINE_RAPID_END_ID = 1132005

export const getTrainTypeString = (
  line: Line.AsObject | null,
  station: Station.AsObject | null,
  direction?: LineDirection | null
): TrainTypeString => {
  if (!line) {
    return 'local'
  }
  // 成田スカイアクセス
  if (line.id === 23006) {
    return 'ltdexp'
  }
  // 中央線快速
  if (line.id === 11312) {
    const rapidIds = range(CHUO_LINE_RAPID_START_ID, CHUO_LINE_RAPID_END_ID + 1)
    // 立川駅
    if (
      rapidIds[rapidIds.length - 1] === station?.id &&
      direction &&
      direction === 'INBOUND'
    ) {
      return 'local'
    }
    if (rapidIds.some((id) => station?.id === id)) {
      return 'rapid'
    }
  }
  // 総武線快速
  if (line.id === 11314) {
    const rapidIds = range(SOBU_LINE_RAPID_START_ID, SOBU_LINE_RAPID_END_ID + 1)
    // 千葉駅
    if (
      rapidIds[rapidIds.length - 1] === station?.id &&
      direction &&
      direction === 'INBOUND'
    ) {
      return 'local'
    }
    // 錦糸町駅
    if (rapidIds[0] === station?.id && direction && direction === 'OUTBOUND') {
      return 'local'
    }
    if (rapidIds.some((id) => station?.id === id)) {
      return 'rapid'
    }
  }
  // 常磐線快速
  if (line.id === 11320) {
    const rapidIds = range(
      JOBAN_LINE_RAPID_START_ID,
      JOBAN_LINE_RAPID_END_ID + 1
    )
    // 北千住駅
    if (
      rapidIds[rapidIds.length - 1] === station?.id &&
      direction &&
      direction === 'INBOUND'
    ) {
      return 'local'
    }
    // 上野駅
    if (rapidIds[0] === station?.id && direction && direction === 'OUTBOUND') {
      return 'local'
    }
    if (rapidIds.some((id) => station?.id === id)) {
      return 'rapid'
    }
  }
  return 'local'
}

import { TrainType } from '../gen/stationapi_pb'

// 100 = 普通
// 101 = 各駅停車
// 300 = 私鉄普通
// 301 = 私鉄各駅停車
export const getIsLocal = (tt: TrainType.AsObject | null): boolean =>
  tt?.typeId === 100 ||
  tt?.typeId === 101 ||
  tt?.typeId === 300 ||
  tt?.typeId === 301
export const getIsRapid = (tt: TrainType.AsObject): boolean =>
  tt?.typeId === 102 || tt?.typeId === 302
export const getIsLtdExp = (tt: TrainType.AsObject): boolean =>
  // 200~299 JR特急
  // 500~599 私鉄特急
  (tt?.typeId >= 200 && tt?.typeId < 300) ||
  (tt?.typeId >= 500 && tt?.typeId < 600)

export const findLocalType = (
  trainTypes: TrainType.AsObject[] | null
): TrainType.AsObject | null => trainTypes?.find((tt) => getIsLocal(tt)) ?? null
export const findBranchLine = (
  trainTypes: TrainType.AsObject[]
): TrainType.AsObject | null =>
  trainTypes.find((tt) => tt.name.indexOf('支線') !== -1) ?? null
export const findRapidType = (
  trainTypes: TrainType.AsObject[] | null
): TrainType.AsObject | null => trainTypes?.find((tt) => getIsRapid(tt)) ?? null
export const findLtdExpType = (
  trainTypes: TrainType.AsObject[] | null
): TrainType.AsObject | null => trainTypes?.find((tt) => getIsRapid(tt)) ?? null
