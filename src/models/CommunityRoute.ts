import type { StopCondition, TrainType } from '~/gen/proto/stationapi_pb';

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
