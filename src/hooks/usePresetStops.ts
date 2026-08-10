import { useCallback, useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import type { LineDirection } from '~/models/Bound';
import { findNearestByCoord } from '~/utils/findNearestByCoord';
import { getPresetOriginStation } from '~/utils/presetRouteEndpoints';

type UsePresetStopsParams = {
  savedRouteDirection: LineDirection | null | undefined;
  /** 保存された始発駅(駅グループID)。古いプリセットには無い */
  savedRouteOriginStationId?: number | null;
  stations: Station[];
  wantedDestination: Station | null | undefined;
  confirmedStation: Station | null | undefined;
};

export const usePresetStops = ({
  savedRouteDirection,
  savedRouteOriginStationId,
  stations,
  wantedDestination,
  confirmedStation,
}: UsePresetStopsParams) => {
  // 保存された乗車駅を優先する。持たない古いプリセットは direction から終端を求める。
  // 終端の解決はプリセットカード・ホーム画面ウィジェットと共通化している
  // (駅一覧の並びが保存時と反転していても行き先と同じ駅を掴まないようにするため)
  const savedOrigin = useMemo(
    () =>
      savedRouteOriginStationId != null
        ? (stations.find((s) => s.groupId === savedRouteOriginStationId) ??
          null)
        : null,
    [savedRouteOriginStationId, stations]
  );

  const presetOrigin = useMemo(
    () =>
      savedOrigin ??
      getPresetOriginStation({
        stations,
        wantedDestinationId: wantedDestination?.groupId ?? null,
        direction: savedRouteDirection ?? null,
      }) ??
      null,
    [savedOrigin, savedRouteDirection, stations, wantedDestination?.groupId]
  );

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

  // 乗車開始駅を座標ベースで探す。
  // 保存された乗車駅がある場合はその駅自身も候補に含める(利用者はそこから乗る想定)。
  // 持たない古いプリセットでは両端が単なる終端なので、どちらの方面を選んでも
  // 同一駅が選ばれ、かつ突っ切らないよう両端を除外する
  const nearestPresetStation = useMemo((): Station | undefined => {
    if (!presetStops) return undefined;

    const firstId = presetStops[0]?.groupId;
    const lastId = presetStops.at(-1)?.groupId;
    const candidates = savedOrigin
      ? presetStops.filter((s) => s.groupId !== wantedDestination?.groupId)
      : presetStops.length < 3
        ? []
        : presetStops.filter(
            (s) => s.groupId !== firstId && s.groupId !== lastId
          );
    if (!candidates.length) return undefined;

    const exact = candidates.find(
      (s) => s.groupId === confirmedStation?.groupId
    );
    if (exact) return exact;

    return findNearestByCoord(
      confirmedStation?.latitude,
      confirmedStation?.longitude,
      candidates
    );
  }, [
    presetStops,
    savedOrigin,
    wantedDestination?.groupId,
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
