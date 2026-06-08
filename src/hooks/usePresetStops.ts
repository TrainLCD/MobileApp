import { useCallback, useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import type { LineDirection } from '~/models/Bound';
import { findNearestByCoord } from '~/utils/findNearestByCoord';

type UsePresetStopsParams = {
  savedRouteDirection: LineDirection | null | undefined;
  stations: Station[];
  wantedDestination: Station | null | undefined;
  confirmedStation: Station | null | undefined;
};

export const usePresetStops = ({
  savedRouteDirection,
  stations,
  wantedDestination,
  confirmedStation,
}: UsePresetStopsParams) => {
  const presetOrigin = useMemo(() => {
    if (!savedRouteDirection) return null;
    return savedRouteDirection === 'INBOUND'
      ? stations[0]
      : (stations.at(-1) ?? null);
  }, [savedRouteDirection, stations]);

  const presetStops = useMemo(() => {
    if (!presetOrigin || !wantedDestination) return undefined;
    const originIdx = stations.findIndex(
      (s) => s.groupId === presetOrigin.groupId
    );
    const wantedIdx = stations.findIndex(
      (s) => s.groupId === wantedDestination.groupId
    );
    if (originIdx === -1 || wantedIdx === -1) return undefined;
    return originIdx <= wantedIdx
      ? stations.slice(originIdx, wantedIdx + 1)
      : stations.slice(wantedIdx, originIdx + 1);
  }, [presetOrigin, wantedDestination, stations]);

  // 両端を除外した中間駅から座標ベースで最寄り駅を探す
  // 両端を除外することで、どちらの方面を選んでも同一駅が選ばれ、かつ突っ切らない
  const nearestPresetStation = useMemo((): Station | undefined => {
    if (!presetStops || presetStops.length < 3) return undefined;

    const firstId = presetStops[0]?.groupId;
    const lastId = presetStops.at(-1)?.groupId;
    const intermediates = presetStops.filter(
      (s) => s.groupId !== firstId && s.groupId !== lastId
    );
    if (!intermediates.length) return undefined;

    const exact = intermediates.find(
      (s) => s.groupId === confirmedStation?.groupId
    );
    if (exact) return exact;

    return findNearestByCoord(
      confirmedStation?.latitude,
      confirmedStation?.longitude,
      intermediates
    );
  }, [
    presetStops,
    confirmedStation?.groupId,
    confirmedStation?.latitude,
    confirmedStation?.longitude,
  ]);

  // presetStops 内の並びから方向を解決する
  const resolvePresetDirection = useCallback(
    (selectedStation: Station, stops: Station[]): LineDirection =>
      stops.at(-1)?.groupId === selectedStation.groupId
        ? 'INBOUND'
        : 'OUTBOUND',
    []
  );

  return {
    presetOrigin,
    presetStops,
    nearestPresetStation,
    resolvePresetDirection,
  };
};
