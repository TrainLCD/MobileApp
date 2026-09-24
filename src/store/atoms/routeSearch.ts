import { atom } from 'jotai';
import type { TrainType } from '~/@types/graphql';
import type { ConnectedRoute } from '~/utils/routeSearch';

/** connectedRoutes の検索条件(並び順を除く) */
export type ConnectedRoutesVariables = {
  fromStationGroupId: number;
  toStationGroupId: number;
  viaLineId?: number;
};

/**
 * 経路検索の結果から fetchedTrainTypes を組み立てたときの、元の経路と検索条件。
 * 種別一覧で並び順を変えて取り直すのに使う。fetchedTrainTypes は駅の種別一覧など
 * ほかの経路でも書き換わるので、trainTypes が今の fetchedTrainTypes と同じ参照の
 * ときだけ有効とみなす(書き換える側で消して回らなくて済む)
 */
export type ConnectedRoutesSource = {
  /** routes から組み立てた fetchedTrainTypes */
  trainTypes: TrainType[];
  /** 乗車に使える経路(おすすめ順)。乗換のある経路の種別の id はこの順位から振る */
  routes: ConnectedRoute[];
  variables: ConnectedRoutesVariables;
};

export const connectedRoutesSourceAtom = atom<ConnectedRoutesSource | null>(
  null
);
