import type { StopCondition, TrainType } from '~/@types/graphql';

type CommunityRouteStation = {
  id: number;
  stopCondition: StopCondition;
};

export type CommunityRoute = {
  id: string;
  userId: number;
  name: string;
  stations: CommunityRouteStation[];
  createdAt: Date;
  trainType: TrainType;
};
