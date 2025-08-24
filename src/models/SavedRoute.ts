import { z } from 'zod';

export const SavedRouteWithTrainTypeSchema = z.object({
  id: z.string().uuid(),
  hasTrainType: z.literal(true),
  trainTypeId: z.number().int().nonnegative(),
  departureStationId: z.number().int().nonnegative().nullish(),
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
  departureStationId: z.number().int().nonnegative().nullish(),
  name: z.string().min(1).max(100),
  createdAt: z.date(),
});

export type SavedRouteWithoutTrainType = z.infer<
  typeof SavedRouteWithoutTrainTypeSchema
>;

// departureStationIdがnullishの場合、現在位置との距離が最も近い駅を出発駅とする（ただし、位置情報が取得できない場合は先頭駅）
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
