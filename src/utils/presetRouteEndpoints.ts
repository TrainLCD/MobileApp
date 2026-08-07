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
 * プリセットの始発駅・終着駅を解決する。
 *
 * wantedDestinationId と direction が保存されている場合は保存時の選択に合わせて終着駅を差し替える。
 *   INBOUND:  from = stations[0],  to = wantedDestination
 *   OUTBOUND: from = stations.at(-1), to = wantedDestination
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
    from: direction === 'INBOUND' ? stations[0] : stations.at(-1),
    to: destStation,
  };
};
