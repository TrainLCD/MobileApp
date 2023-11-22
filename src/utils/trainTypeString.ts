import { TrainType, TrainTypeKind } from '../gen/stationapi_pb'

// 301 = 私鉄各駅停車
export const getIsLocal = (tt: TrainType.AsObject | null): boolean =>
  tt?.kind === TrainTypeKind.DEFAULT
export const getIsRapid = (tt: TrainType.AsObject | null): boolean =>
  tt?.kind === TrainTypeKind.RAPID
export const getIsLtdExp = (tt: TrainType.AsObject | null): boolean =>
  tt?.kind === TrainTypeKind.LIMITEDEXPRESS

export const findLocalType = (
  trainTypes: TrainType.AsObject[] | null
): TrainType.AsObject | null => trainTypes?.find((tt) => getIsLocal(tt)) ?? null
export const findBranchLine = (
  trainTypes: TrainType.AsObject[]
): TrainType.AsObject | null =>
  trainTypes.find((tt) => tt.kind === TrainTypeKind.BRANCH) ?? null
export const findRapidType = (
  trainTypes: TrainType.AsObject[] | null
): TrainType.AsObject | null => trainTypes?.find((tt) => getIsRapid(tt)) ?? null
export const findLtdExpType = (
  trainTypes: TrainType.AsObject[] | null
): TrainType.AsObject | null => trainTypes?.find((tt) => getIsRapid(tt)) ?? null
