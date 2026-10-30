import { useAtomValue, useStore } from 'jotai';
import { useCallback, useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { GET_LINE_STATIONS } from '~/lib/graphql/queries';
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
import { useGraphQLQuery } from './useGraphQLQuery';

/** 現在路線の全駅から、種別・方向・行き先を維持して補正する。 */
export const useManualCurrentStation = () => {
  const stations = useAtomValue(stationsAtom);
  const bound = useAtomValue(selectedBoundAtom);
  const currentLine = useCurrentLine();
  const store = useStore();
  const { data } = useGraphQLQuery<{ lineStations: Station[] }>(
    GET_LINE_STATIONS,
    {
      variables: { lineId: currentLine?.id },
      skip: !bound || !currentLine,
    }
  );
  const selectableStations = useMemo(() => {
    if (!bound || !currentLine) return [];
    const routeStations = stations.filter(
      (station) => station.line?.id === currentLine.id
    );
    // 経路上の駅は種別・通過情報とオブジェクト参照を維持する。
    const routeById = new Map(
      routeStations.map((station) => [station.id, station])
    );
    const lineStations = data?.lineStations.filter(
      (station) => station.line?.id === currentLine.id
    );
    return lineStations?.length
      ? lineStations.map((station) => routeById.get(station.id) ?? station)
      : routeStations;
  }, [bound, currentLine, data, stations]);
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
