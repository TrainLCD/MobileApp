import { LineType } from '../../gen/proto/stationapi_pb';

// 路線種別による最高速度
export const LINE_TYPE_MAX_SPEEDS_IN_M_S: Record<LineType, number> = {
  [LineType.BulletTrain]: 83.33333333333, // 300km/h
  [LineType.MonorailOrAGT]: 22.22222222222, // 80km/h
  [LineType.Normal]: 25, // 90km/h
  [LineType.OtherLineType]: 25, // 90km/h
  [LineType.Subway]: 22.22222222222, // 80km/h
  [LineType.Tram]: 11.11111111111, // 40km/h
} as const;
// 路線種別による加速度
export const LINE_TYPE_MAX_ACCEL_IN_M_S: Record<LineType, number> = {
  [LineType.BulletTrain]: 2.6,
  [LineType.MonorailOrAGT]: 3.5,
  [LineType.Normal]: 3.0,
  [LineType.OtherLineType]: 3.0,
  [LineType.Subway]: 3.0,
  [LineType.Tram]: 3.0,
} as const;
// 路線種別による減速度
export const LINE_TYPE_MAX_DECEL_IN_M_S: Record<LineType, number> = {
  [LineType.BulletTrain]: 1.0,
  [LineType.MonorailOrAGT]: 1.7,
  [LineType.Normal]: 1.7,
  [LineType.OtherLineType]: 1.7,
  [LineType.Subway]: 1.7,
  [LineType.Tram]: 1.7,
} as const;
