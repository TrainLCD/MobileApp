import { atom, type Getter } from 'jotai';
import type { SetStateAction } from 'react';
import type { Station } from '~/@types/graphql';
import type { LineDirection } from '../../models/Bound';

export interface StationState {
  arrived: boolean;
  approaching: boolean;
  station: Station | null;
  stations: Station[];
  stationsCache: Station[][];
  pendingStation: Station | null;
  pendingStations: Station[];
  selectedDirection: LineDirection | null;
  selectedBound: Station | null;
  wantedDestination: Station | null;
}

// フィールド単位のプリミティブatom。
// モノリシックなオブジェクトatom全体を購読すると無関係なフィールドの変更でも
// 購読コンポーネントが再レンダーされるため、読み取りは必ずこちらを購読する。
export const arrivedAtom = atom(true);
export const approachingAtom = atom(false);
export const stationAtom = atom<Station | null>(null);
export const stationsAtom = atom<Station[]>([]);
export const stationsCacheAtom = atom<Station[][]>([]);
export const pendingStationAtom = atom<Station | null>(null);
export const pendingStationsAtom = atom<Station[]>([]);
export const selectedDirectionAtom = atom<LineDirection | null>(null);
export const selectedBoundAtom = atom<Station | null>(null);
export const wantedDestinationAtom = atom<Station | null>(null);

const readStationState = (get: Getter): StationState => ({
  arrived: get(arrivedAtom),
  approaching: get(approachingAtom),
  station: get(stationAtom),
  stations: get(stationsAtom),
  stationsCache: get(stationsCacheAtom),
  pendingStation: get(pendingStationAtom),
  pendingStations: get(pendingStationsAtom),
  selectedDirection: get(selectedDirectionAtom),
  selectedBound: get(selectedBoundAtom),
  wantedDestination: get(wantedDestinationAtom),
});

// 互換ファサード: 既存の setStationState(prev => ({ ...prev, x })) 形式の
// 書き込みを、変更があったフィールドのatomだけへ分配する。
// 読み取りで購読すると全フィールドの変更で再レンダーされるため、
// 新規コードでの読み取り購読には使わずフィールドatomを使うこと。
const stationState = atom(
  readStationState,
  (get, set, update: SetStateAction<StationState>) => {
    const prev = readStationState(get);
    const next = typeof update === 'function' ? update(prev) : update;
    if (!Object.is(prev.arrived, next.arrived)) {
      set(arrivedAtom, next.arrived);
    }
    if (!Object.is(prev.approaching, next.approaching)) {
      set(approachingAtom, next.approaching);
    }
    if (!Object.is(prev.station, next.station)) {
      set(stationAtom, next.station);
    }
    if (!Object.is(prev.stations, next.stations)) {
      set(stationsAtom, next.stations);
    }
    if (!Object.is(prev.stationsCache, next.stationsCache)) {
      set(stationsCacheAtom, next.stationsCache);
    }
    if (!Object.is(prev.pendingStation, next.pendingStation)) {
      set(pendingStationAtom, next.pendingStation);
    }
    if (!Object.is(prev.pendingStations, next.pendingStations)) {
      set(pendingStationsAtom, next.pendingStations);
    }
    if (!Object.is(prev.selectedDirection, next.selectedDirection)) {
      set(selectedDirectionAtom, next.selectedDirection);
    }
    if (!Object.is(prev.selectedBound, next.selectedBound)) {
      set(selectedBoundAtom, next.selectedBound);
    }
    if (!Object.is(prev.wantedDestination, next.wantedDestination)) {
      set(wantedDestinationAtom, next.wantedDestination);
    }
  }
);

export default stationState;
