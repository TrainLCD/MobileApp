import type { LocationObject } from 'expo-location';
import { atom } from 'jotai';
import type { Station } from '~/@types/graphql';
import { locationAtom } from './location';
import { stationAtom, stationsAtom } from './station';

// 補正前の測位が再レンダーで再適用されるのを防ぐ。新しい測位または経路では解除する。
export const manualStationCorrectionAtom = atom<{
  station: Station;
  location: LocationObject | null;
  stations: Station[];
} | null>(null);

// 経路外の手動指定だけを優先し、通常の接続駅・通過駅の解決は維持する。
// 派生atomで共有し、測位更新ごとに各利用箇所を再レンダーさせない。
export const manualOutsideRouteStationAtom = atom((get) => {
  const correction = get(manualStationCorrectionAtom);
  if (
    !correction ||
    correction.station !== get(stationAtom) ||
    correction.stations !== get(stationsAtom) ||
    correction.location !== get(locationAtom) ||
    correction.stations.some((station) => station.id === correction.station.id)
  ) {
    return null;
  }
  return correction.station;
});
