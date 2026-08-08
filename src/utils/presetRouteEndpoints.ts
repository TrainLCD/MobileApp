import type { Station } from '~/@types/graphql';
import type { LineDirection } from '~/models/Bound';

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
 * 保存時のUI(SavePresetNameModal)は始発駅と行き先が同じ選択肢を除外しているため、
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
