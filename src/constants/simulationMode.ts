import { LineType } from '../../gen/proto/stationapi_pb';

// 路線種別による最高速度
export const LINE_TYPE_MAX_SPEEDS_IN_KM_H: Record<LineType, number> = {
  [LineType.BulletTrain]: 300,
  [LineType.MonorailOrAGT]: 80,
  [LineType.Normal]: 90,
  [LineType.OtherLineType]: 90,
  [LineType.Subway]: 80,
  [LineType.Tram]: 40,
} as const;
// 路線種別による加速度
export const LINE_TYPE_MAX_ACCELERATION_IN_KM_H_S: Record<LineType, number> = {
  [LineType.BulletTrain]: 2.6,
  [LineType.MonorailOrAGT]: 3.5,
  [LineType.Normal]: 3.0,
  [LineType.OtherLineType]: 3.0,
  [LineType.Subway]: 3.0,
  [LineType.Tram]: 3.0,
} as const;
