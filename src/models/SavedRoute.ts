import { z } from 'zod';

const DirectionSchema = z.enum(['INBOUND', 'OUTBOUND']);

/** 乗換のある経路の 1 区間。経路検索で選んだ区間を、開いたときに同じ駅リストへ組み直すために持つ */
export const SavedRouteLegSchema = z.object({
  /** 区間で乗る種別の系統(lineGroupId) */
  lineGroupId: z.number().int().nonnegative(),
  /** 区間の乗車駅の駅 ID */
  fromStationId: z.number().int().nonnegative(),
  /** 区間の降車駅の駅 ID */
  toStationId: z.number().int().nonnegative(),
  /** 乗車駅から降車駅までの駅グループ ID(進行順、通過駅を含む) */
  stationGroupIds: z.array(z.number().int().nonnegative()),
});

export type SavedRouteLeg = z.infer<typeof SavedRouteLegSchema>;

export const SavedRouteWithTrainTypeSchema = z.object({
  id: z.string().uuid(),
  hasTrainType: z.literal(true),
  lineId: z.number().int().nonnegative(),
  trainTypeId: z.number().int().nonnegative(),
  wantedDestinationId: z.number().int().nonnegative().nullable(),
  /** 始発駅の駅グループID。未保存の古いプリセットは null */
  originStationId: z.number().int().nonnegative().nullable(),
  direction: DirectionSchema.nullable(),
  notifyStationIds: z.array(z.number().int().nonnegative()).default([]),
  /**
   * 乗換のある経路の区間(2 区間以上)。乗換のない経路は持たない。
   * lineId・trainTypeId には最初の区間の値が入る
   */
  legs: z.array(SavedRouteLegSchema).min(2).optional(),
  name: z.string().min(1).max(100),
  createdAt: z.date(),
});

export type SavedRouteWithTrainType = z.infer<
  typeof SavedRouteWithTrainTypeSchema
>;

export const SavedRouteWithoutTrainTypeSchema = z.object({
  id: z.string().uuid(),
  hasTrainType: z.literal(false),
  lineId: z.number().int().nonnegative(),
  trainTypeId: z.null(),
  wantedDestinationId: z.number().int().nonnegative().nullable(),
  /** 始発駅の駅グループID。未保存の古いプリセットは null */
  originStationId: z.number().int().nonnegative().nullable(),
  direction: DirectionSchema.nullable(),
  notifyStationIds: z.array(z.number().int().nonnegative()).default([]),
  name: z.string().min(1).max(100),
  createdAt: z.date(),
});

export type SavedRouteWithoutTrainType = z.infer<
  typeof SavedRouteWithoutTrainTypeSchema
>;

export const SavedRouteSchema = z.discriminatedUnion('hasTrainType', [
  SavedRouteWithTrainTypeSchema,
  SavedRouteWithoutTrainTypeSchema,
]);

export type SavedRoute = z.infer<typeof SavedRouteSchema>;

export type SavedRouteWithTrainTypeInput = Omit<SavedRouteWithTrainType, 'id'>;
export type SavedRouteWithoutTrainTypeInput = Omit<
  SavedRouteWithoutTrainType,
  'id'
>;
export type SavedRouteInput =
  | SavedRouteWithTrainTypeInput
  | SavedRouteWithoutTrainTypeInput;
