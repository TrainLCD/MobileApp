import type { Station } from '~/@types/graphql';
import type { LineDirection } from '~/models/Bound';
import { findNearestByCoord } from './findNearestByCoord';

type PresetRouteLike = {
  stations: Station[];
  wantedDestinationId?: number | null;
  /** 保存時の始発駅(駅グループID)。古いプリセットには無い */
  originStationId?: number | null;
  direction?: LineDirection | null;
};

export type PresetRouteEndpoints = {
  from: Station | undefined;
  to: Station | undefined;
};

/**
 * プリセットの始発駅を解決する。
 *
 * 保存された direction は「駅一覧のどちら側の終端から乗るか」を表す:
 *   INBOUND:  stations[0]
 *   OUTBOUND: stations.at(-1)
 *
 * ただし駅一覧の並び順は取得経路で揃っていない。
 * 保存時は `lineGroupStations` / `lineStations`(単一路線・単一系統)、
 * プリセット一覧とホーム画面ウィジェットは `lineGroupListStations` / `lineListStations`(一括取得)
 * を使っており、後者は並びが反転して返ることがある。
 * その場合 direction をそのまま当てると始発駅が行き先と同じ駅になってしまう。
 *
 * 保存時の解決(`resolvePresetSaveRoute`)は始発駅が行き先と同じになる向きを選ばないため、
 * 「direction から求めた終端が行き先と一致する」状態は並びの食い違いでしか起こらない。
 * そこを検知したら反対側の終端へ倒すことで、並び順に依存せず始発駅を復元する。
 */
export const getPresetOriginStation = ({
  stations,
  wantedDestinationId,
  direction,
}: PresetRouteLike): Station | undefined => {
  if (!direction) {
    return undefined;
  }

  const head: Station | undefined = stations[0];
  const tail: Station | undefined = stations.at(-1);
  const origin = direction === 'INBOUND' ? head : tail;
  const opposite = direction === 'INBOUND' ? tail : head;

  if (
    wantedDestinationId != null &&
    origin?.groupId === wantedDestinationId &&
    opposite?.groupId !== wantedDestinationId
  ) {
    return opposite;
  }

  return origin;
};

type ResolvePresetSaveRouteParams = {
  stations: Station[];
  wantedDestinationId?: number | null;
  /** 乗車駅として扱う駅(選択中の乗車駅、無ければGPS確定駅) */
  currentStation?: Station | null;
};

export type PresetSaveRoute = {
  /** 経路内の最寄駅。プリセットの始発駅として保存する */
  originStation: Station | undefined;
  direction: LineDirection | null;
};

/**
 * プリセット保存時の始発駅と direction を自動解決する。
 *
 * 始発駅は経路内の最寄駅とする。現在駅が駅一覧に含まれていればその駅を、
 * 含まれていなければ座標距離で最も近い駅を採る。
 *
 * direction は「駅一覧のどちら側の終端から乗るか」を表す(`getPresetOriginStation` 参照)。
 * 始発駅を持たない古いプリセットの復元に使うため、引き続き保存する。
 *
 * 行き先そのものは始発駅になり得ないため候補から除外する。
 * これは `getPresetOriginStation` が並び順の食い違いを検知するための前提でもある。
 */
export const resolvePresetSaveRoute = ({
  stations,
  wantedDestinationId,
  currentStation,
}: ResolvePresetSaveRouteParams): PresetSaveRoute => {
  const unresolved: PresetSaveRoute = {
    originStation: undefined,
    direction: null,
  };

  if (wantedDestinationId == null) {
    return unresolved;
  }

  const destIndex = stations.findIndex(
    (s) => s.groupId === wantedDestinationId
  );
  if (destIndex === -1) {
    return unresolved;
  }

  const isHead = destIndex === 0;
  const isTail = destIndex === stations.length - 1;
  if (isHead && isTail) {
    return unresolved;
  }

  const candidates = stations.filter((s) => s.groupId !== wantedDestinationId);
  const originStation =
    candidates.find((s) => s.groupId === currentStation?.groupId) ??
    findNearestByCoord(
      currentStation?.latitude,
      currentStation?.longitude,
      candidates
    );

  if (originStation) {
    const originIndex = stations.findIndex(
      (s) => s.groupId === originStation.groupId
    );
    return {
      originStation,
      direction: originIndex < destIndex ? 'INBOUND' : 'OUTBOUND',
    };
  }

  // 最寄駅を特定できなくても、行き先が終端なら乗る向きは一意に定まる
  if (isHead) {
    return { originStation: undefined, direction: 'OUTBOUND' };
  }
  if (isTail) {
    return { originStation: undefined, direction: 'INBOUND' };
  }
  return unresolved;
};

/**
 * プリセットの始発駅・終着駅を解決する。
 *
 * wantedDestinationId が保存されている場合は保存時の選択に合わせて終着駅を差し替える。
 *
 * 始発駅は保存された originStationId(乗車駅)を優先する。
 * originStationId を持たない古いプリセットは direction から終端を求める(`getPresetOriginStation`)。
 *
 * プリセットカードとホーム画面ウィジェットの双方が同じ端点を表示する必要があるため共通化している。
 */
export const getPresetRouteEndpoints = ({
  stations,
  wantedDestinationId,
  originStationId,
  direction,
}: PresetRouteLike): PresetRouteEndpoints => {
  const from: Station | undefined = stations[0];
  const to: Station | undefined = stations.at(-1);

  if (wantedDestinationId == null) {
    return { from, to };
  }

  const destStation = stations.find((s) => s.groupId === wantedDestinationId);
  if (!destStation) {
    return { from, to };
  }

  const originStation =
    originStationId != null
      ? stations.find((s) => s.groupId === originStationId)
      : undefined;
  if (originStation) {
    return { from: originStation, to: destStation };
  }

  if (!direction) {
    return { from, to };
  }

  return {
    from: getPresetOriginStation({ stations, wantedDestinationId, direction }),
    to: destStation,
  };
};
