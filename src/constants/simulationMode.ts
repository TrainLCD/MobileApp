import { LineType, TrainTypeKind } from '~/@types/graphql';

// 路線種別による最高速度
export const LINE_TYPE_MAX_SPEEDS_IN_M_S: Record<LineType, number> = {
  [LineType.BulletTrain]: 88.88888889, // 320km/h
  [LineType.MonorailOrAgt]: 22.22222222222, // 80km/h
  [LineType.Normal]: 25, // 90km/h
  [LineType.OtherLineType]: 25, // 90km/h
  [LineType.Subway]: 22.22222222222, // 80km/h
  [LineType.Tram]: 11.11111111111, // 40km/h
} as const;
// 列車種別による最高速度
export const TRAIN_TYPE_KIND_MAX_SPEEDS_IN_M_S: Record<
  TrainTypeKind,
  number | null
> = {
  [TrainTypeKind.Branch]: null,
  [TrainTypeKind.Default]: null,
  [TrainTypeKind.Rapid]: null,
  [TrainTypeKind.Express]: null,
  [TrainTypeKind.LimitedExpress]: 36.1111111111, // 130km/h
  [TrainTypeKind.HighSpeedRapid]: 36.1111111111, // 130km/h
} as const;
// 路線種別による加速度
export const LINE_TYPE_MAX_ACCEL_IN_M_S: Record<LineType, number> = {
  [LineType.BulletTrain]: 2.6,
  [LineType.MonorailOrAgt]: 3.5,
  [LineType.Normal]: 3.0,
  [LineType.OtherLineType]: 3.0,
  [LineType.Subway]: 3.0,
  [LineType.Tram]: 3.0,
} as const;
// 路線種別による減速度
export const LINE_TYPE_MAX_DECEL_IN_M_S: Record<LineType, number> = {
  [LineType.BulletTrain]: 1.6,
  [LineType.MonorailOrAgt]: 2.0,
  [LineType.Normal]: 2.0,
  [LineType.OtherLineType]: 2.0,
  [LineType.Subway]: 2.5,
  [LineType.Tram]: 2.0,
} as const;
