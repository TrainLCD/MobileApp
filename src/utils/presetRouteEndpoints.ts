import type { Station } from '~/@types/graphql';
import type { LineDirection } from '~/models/Bound';
import { findNearestByCoord } from './findNearestByCoord';

type PresetRouteLike = {
  stations: Station[];
  wantedDestinationId?: number | null;
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
 * 保存時の direction 解決(`resolvePresetSaveDirection`)は始発駅が行き先と同じになる向きを選ばないため、
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

type ResolvePresetSaveDirectionParams = {
  stations: Station[];
  wantedDestinationId?: number | null;
  /** 乗車駅として扱う駅(選択中の乗車駅、無ければGPS確定駅) */
  currentStation?: Station | null;
};

/**
 * プリセット保存時の direction を自動解決する。
 *
 * direction は「駅一覧のどちら側の終端から乗るか」を表す(`getPresetOriginStation` 参照)。
 * 保存する経路は行き先を境に片側だけなので、経路内の最寄駅がどちら側にあるかで向きが一意に決まる。
 * 実際の始発駅は復元時に `usePresetStops` が経路内の最寄駅として解決する。
 *
 * 最寄駅は現在駅が駅一覧に含まれていればその駅を、含まれていなければ座標距離で最も近い駅を採る。
 *
 * 行き先そのものは始発駅になり得ないため候補から除外する。
 * これは `getPresetOriginStation` が並び順の食い違いを検知するための前提でもある。
 */
export const resolvePresetSaveDirection = ({
  stations,
  wantedDestinationId,
  currentStation,
}: ResolvePresetSaveDirectionParams): LineDirection | null => {
  if (wantedDestinationId == null) {
    return null;
  }

  const destIndex = stations.findIndex(
    (s) => s.groupId === wantedDestinationId
  );
  if (destIndex === -1) {
    return null;
  }

  // 行き先が終端にある場合、始発駅になり得る終端は反対側だけに定まる
  const isHead = destIndex === 0;
  const isTail = destIndex === stations.length - 1;
  if (isHead && isTail) {
    return null;
  }
  if (isHead) {
    return 'OUTBOUND';
  }
  if (isTail) {
    return 'INBOUND';
  }

  const candidates = stations.filter((s) => s.groupId !== wantedDestinationId);
  const nearest =
    candidates.find((s) => s.groupId === currentStation?.groupId) ??
    findNearestByCoord(
      currentStation?.latitude,
      currentStation?.longitude,
      candidates
    );
  if (!nearest) {
    return null;
  }

  const nearestIndex = stations.findIndex((s) => s.groupId === nearest.groupId);
  return nearestIndex < destIndex ? 'INBOUND' : 'OUTBOUND';
};

/**
 * プリセットの始発駅・終着駅を解決する。
 *
 * wantedDestinationId と direction が保存されている場合は保存時の選択に合わせて終着駅を差し替える。
 * 始発駅の解決は `getPresetOriginStation` を参照。
 *
 * プリセットカードとホーム画面ウィジェットの双方が同じ端点を表示する必要があるため共通化している。
 */
export const getPresetRouteEndpoints = ({
  stations,
  wantedDestinationId,
  direction,
}: PresetRouteLike): PresetRouteEndpoints => {
  const from: Station | undefined = stations[0];
  const to: Station | undefined = stations.at(-1);

  if (wantedDestinationId == null || !direction) {
    return { from, to };
  }

  const destStation = stations.find((s) => s.groupId === wantedDestinationId);
  if (!destStation) {
    return { from, to };
  }

  return {
    from: getPresetOriginStation({ stations, wantedDestinationId, direction }),
    to: destStation,
  };
};
