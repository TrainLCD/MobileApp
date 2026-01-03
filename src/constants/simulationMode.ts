import { LineType, TrainTypeKind } from '~/@types/graphql';

// バスの速度パラメータ（都営バス基準）
// 都市部での実運用を考慮
export const BUS_MAX_SPEED_IN_M_S = 11.11111111111; // 40km/h
export const BUS_MAX_ACCEL_IN_M_S = 1.2; // 1.2 m/s² - 立ち客を考慮した緩やかな加速
export const BUS_MAX_DECEL_IN_M_S = 1.3; // 1.3 m/s² - 乗客の安全を考慮した減速

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
  [LineType.BulletTrain]: 0.72, // 2.6 km/h/s (N700系基準)
  [LineType.MonorailOrAgt]: 0.97, // 3.5 km/h/s
  [LineType.Normal]: 0.83, // 3.0 km/h/s
  [LineType.OtherLineType]: 0.83, // 3.0 km/h/s
  [LineType.Subway]: 0.83, // 3.0 km/h/s
  [LineType.Tram]: 0.83, // 3.0 km/h/s
} as const;
// 路線種別による減速度
export const LINE_TYPE_MAX_DECEL_IN_M_S: Record<LineType, number> = {
  [LineType.BulletTrain]: 0.56, // 2.0 km/h/s (長距離減速を考慮)
  [LineType.MonorailOrAgt]: 0.69, // 2.5 km/h/s
  [LineType.Normal]: 0.69, // 2.5 km/h/s
  [LineType.OtherLineType]: 0.69, // 2.5 km/h/s
  [LineType.Subway]: 0.83, // 3.0 km/h/s (駅間が短いため高め)
  [LineType.Tram]: 0.69, // 2.5 km/h/s
} as const;
