import { useAtomValue, useStore } from 'jotai';
import { useCallback, useMemo } from 'react';
import type { Station, TrainType } from '~/@types/graphql';
import {
  GET_LINE_LIST_STATIONS,
  GET_STATION_TRAIN_TYPES_LIGHT,
} from '~/lib/graphql/queries';
import { etaAnchorAtom } from '~/store/atoms/etaFallback';
import { locationAtom } from '~/store/atoms/location';
import { manualStationCorrectionAtom } from '~/store/atoms/manualStationCorrection';
import { stationForHeaderAtom } from '~/store/atoms/navigation';
import { resetFirstSpeechAtom } from '~/store/atoms/speech';
import stationState, {
  selectedBoundAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useGraphQLQuery } from './useGraphQLQuery';

/** 直通経路の各路線の全駅から、種別・方向・行き先を維持して補正する。 */
export const useManualCurrentStation = () => {
  const stations = useAtomValue(stationsAtom);
  const bound = useAtomValue(selectedBoundAtom);
  const currentLine = useCurrentLine();
  const currentStation = useCurrentStation();
  const store = useStore();
  // 選択中の種別だけでは、西武方面と東武方面のような分岐先が欠ける。
  const { data: trainTypesData } = useGraphQLQuery<{
    stationTrainTypes: TrainType[];
  }>(GET_STATION_TRAIN_TYPES_LIGHT, {
    variables: { stationId: currentStation?.id },
    skip: !bound || currentStation?.id == null,
  });
  const lineIds = useMemo(() => {
    const ids = new Set<number>();
    for (const station of stations) {
      if (station.line?.id != null) ids.add(station.line.id);
    }
    if (currentLine?.id != null) ids.add(currentLine.id);
    for (const trainType of trainTypesData?.stationTrainTypes ?? []) {
      for (const line of trainType.lines ?? []) {
        if (line?.id != null) ids.add(line.id);
      }
    }
    return [...ids];
  }, [currentLine?.id, stations, trainTypesData]);
  // lineStations は代表系統を選ぶため、種別に依存しない lineListStations を使う。
  const { data } = useGraphQLQuery<{ lineListStations: Station[] }>(
    GET_LINE_LIST_STATIONS,
    {
      variables: { lineIds },
      skip: !bound || !currentLine,
    }
  );
  const selectableStations = useMemo(() => {
    if (!bound || !currentLine) return [];
    const routeStations = stations;
    // 経路上の駅は種別・通過情報とオブジェクト参照を維持する。
    const routeById = new Map(
      routeStations.map((station) => [station.id, station])
    );
    const lineStations = data?.lineListStations.filter(
      (station) => station.line?.id != null && lineIds.includes(station.line.id)
    );
    return lineStations?.length
      ? lineStations.map((station) => routeById.get(station.id) ?? station)
      : routeStations;
  }, [bound, currentLine, data, lineIds, stations]);
  const selectStation = useCallback(
    (station: Station) => {
      // 一覧表示後に経路が変わった場合、古い駅オブジェクトでは補正しない。
      if (
        !bound ||
        store.get(selectedBoundAtom) !== bound ||
        store.get(stationsAtom) !== stations ||
        !selectableStations.includes(station)
      )
        return;
      store.set(manualStationCorrectionAtom, {
        station,
        location: store.get(locationAtom),
        stations: store.get(stationsAtom),
      });
      store.set(etaAnchorAtom, null);
      store.set(stationState, (prev) => ({
        ...prev,
        station,
        approaching: false,
      }));
      store.set(stationForHeaderAtom, station);
      store.set(resetFirstSpeechAtom, (prev) => prev + 1);
    },
    [bound, selectableStations, stations, store]
  );
  return { selectableStations, selectStation };
};
