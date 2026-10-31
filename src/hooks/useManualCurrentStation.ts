import { useAtomValue, useStore } from 'jotai';
import { useCallback } from 'react';
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

/** 確定済みの経路から、直通先と通過駅を含めて現在駅を補正する。 */
export const useManualCurrentStation = () => {
  const stations = useAtomValue(stationsAtom);
  const bound = useAtomValue(selectedBoundAtom);
  const currentLine = useCurrentLine();
  const store = useStore();
  // 起点・行き先を確定した経路を使い、路線全体や別系統へ候補を広げない。
  const selectableStations = bound && currentLine ? stations : [];
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
