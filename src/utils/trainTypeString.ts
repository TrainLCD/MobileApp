import { TrainType, TrainTypeKind } from '../../gen/proto/stationapi_pb'

// 301 = 私鉄各駅停車
export const getIsLocal = (tt: TrainType | null): boolean =>
  tt?.kind === TrainTypeKind.Default
export const getIsRapid = (tt: TrainType | null): boolean =>
  tt?.kind === TrainTypeKind.Rapid
export const getIsLtdExp = (tt: TrainType | null): boolean =>
  tt?.kind === TrainTypeKind.LimitedExpress

export const findLocalType = (
  trainTypes: TrainType[] | null
): TrainType | null => trainTypes?.find((tt) => getIsLocal(tt)) ?? null
export const findBranchLine = (trainTypes: TrainType[]): TrainType | null =>
  trainTypes.find((tt) => tt.kind === TrainTypeKind.Branch) ?? null
export const findRapidType = (
  trainTypes: TrainType[] | null
): TrainType | null => trainTypes?.find((tt) => getIsRapid(tt)) ?? null
export const findLtdExpType = (
  trainTypes: TrainType[] | null
): TrainType | null => trainTypes?.find((tt) => getIsRapid(tt)) ?? null
