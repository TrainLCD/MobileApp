import { useAtomValue, useStore } from 'jotai';
import { useCallback, useMemo } from 'react';
import type { Station } from '~/@types/graphql';
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

/** 現在の運行経路の駅オブジェクトを使い、種別・方向・行き先を維持して補正する。 */
export const useManualCurrentStation = () => {
  const stations = useAtomValue(stationsAtom);
  const bound = useAtomValue(selectedBoundAtom);
  const currentLine = useCurrentLine();
  const store = useStore();
  const selectableStations = useMemo(
    () =>
      bound && currentLine
        ? stations.filter((station) => station.line?.id === currentLine.id)
        : [],
    [bound, currentLine, stations]
  );
  const selectStation = useCallback(
    (station: Station) => {
      // 一覧表示後に経路が変わった場合、古い駅オブジェクトでは補正しない。
      if (
        !store.get(selectedBoundAtom) ||
        !store.get(stationsAtom).includes(station)
      )
        return;
      store.set(manualStationCorrectionAtom, {
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
    [store]
  );
  return { selectableStations, selectStation };
};
