import { atom, type Getter } from 'jotai';
import type { SetStateAction } from 'react';
import type { Station, TrainType } from '~/@types/graphql';
import type { SavedRoute } from '~/models/SavedRoute';
import {
  ALL_AVAILABLE_LANGUAGES,
  type AvailableLanguage,
} from '../../constants';
import type { BottomTransitionState } from '../../models/BottomTransitionState';
import type { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { isJapanese } from '../../translation';

export type LoopItem = (SavedRoute & { stations: Station[] }) & {
  __k: string;
};

export interface NavigationState {
  leftStations: Station[];
  pendingTrainType: TrainType | null;
  trainType: TrainType | null;
  headerState: HeaderTransitionState;
  bottomState: BottomTransitionState;
  // stationForHeader: 急行等で使用しているとき地理的な最寄り駅と次の停車駅が違う時があるので、
  // 実際の次の停車駅を保持している
  stationForHeader: Station | null;
  enabledLanguages: AvailableLanguage[];
  fetchedTrainTypes: TrainType[];
  autoModeEnabled: boolean;
  isAppLatest: boolean;
  firstStop: boolean;
  presetsFetched: boolean;
  presetRoutes: SavedRoute[];
  pendingQuickActionRouteId: string | null;
}

export const initialNavigationState: NavigationState = {
  headerState: (isJapanese ? 'CURRENT' : 'CURRENT_EN') as HeaderTransitionState,
  pendingTrainType: null,
  trainType: null,
  bottomState: 'LINE' as BottomTransitionState,
  leftStations: [],
  stationForHeader: null,
  enabledLanguages: ALL_AVAILABLE_LANGUAGES,
  fetchedTrainTypes: [],
  autoModeEnabled: false,
  isAppLatest: false,
  firstStop: true,
  presetsFetched: false,
  presetRoutes: [],
  pendingQuickActionRouteId: null,
};

// フィールド単位のプリミティブatom。
// headerState/bottomStateは数秒間隔でローテーションするため、モノリシックな
// オブジェクトatom全体を購読すると無関係なコンポーネントまで数秒ごとに
// 再レンダーされる。読み取りは必ずこちらを購読する。
export const leftStationsAtom = atom<Station[]>(
  initialNavigationState.leftStations
);
export const pendingTrainTypeAtom = atom<TrainType | null>(
  initialNavigationState.pendingTrainType
);
export const trainTypeAtom = atom<TrainType | null>(
  initialNavigationState.trainType
);
export const headerStateAtom = atom<HeaderTransitionState>(
  initialNavigationState.headerState
);
export const bottomStateAtom = atom<BottomTransitionState>(
  initialNavigationState.bottomState
);
export const stationForHeaderAtom = atom<Station | null>(
  initialNavigationState.stationForHeader
);
export const enabledLanguagesAtom = atom<AvailableLanguage[]>(
  initialNavigationState.enabledLanguages
);
export const fetchedTrainTypesAtom = atom<TrainType[]>(
  initialNavigationState.fetchedTrainTypes
);
export const autoModeEnabledAtom = atom(initialNavigationState.autoModeEnabled);
export const isAppLatestAtom = atom(initialNavigationState.isAppLatest);
export const firstStopAtom = atom(initialNavigationState.firstStop);
export const presetsFetchedAtom = atom(initialNavigationState.presetsFetched);
export const presetRoutesAtom = atom<SavedRoute[]>(
  initialNavigationState.presetRoutes
);
export const pendingQuickActionRouteIdAtom = atom<string | null>(
  initialNavigationState.pendingQuickActionRouteId
);

const readNavigationState = (get: Getter): NavigationState => ({
  leftStations: get(leftStationsAtom),
  pendingTrainType: get(pendingTrainTypeAtom),
  trainType: get(trainTypeAtom),
  headerState: get(headerStateAtom),
  bottomState: get(bottomStateAtom),
  stationForHeader: get(stationForHeaderAtom),
  enabledLanguages: get(enabledLanguagesAtom),
  fetchedTrainTypes: get(fetchedTrainTypesAtom),
  autoModeEnabled: get(autoModeEnabledAtom),
  isAppLatest: get(isAppLatestAtom),
  firstStop: get(firstStopAtom),
  presetsFetched: get(presetsFetchedAtom),
  presetRoutes: get(presetRoutesAtom),
  pendingQuickActionRouteId: get(pendingQuickActionRouteIdAtom),
});

// 互換ファサード: 既存の setNavigationState(prev => ({ ...prev, x })) 形式の
// 書き込みを、変更があったフィールドのatomだけへ分配する。
// 読み取りで購読すると全フィールドの変更で再レンダーされるため、
// 新規コードでの読み取り購読には使わずフィールドatomを使うこと。
const navigationState = atom(
  readNavigationState,
  (get, set, update: SetStateAction<NavigationState>) => {
    const prev = readNavigationState(get);
    const next = typeof update === 'function' ? update(prev) : update;
    if (!Object.is(prev.leftStations, next.leftStations)) {
      set(leftStationsAtom, next.leftStations);
    }
    if (!Object.is(prev.pendingTrainType, next.pendingTrainType)) {
      set(pendingTrainTypeAtom, next.pendingTrainType);
    }
    if (!Object.is(prev.trainType, next.trainType)) {
      set(trainTypeAtom, next.trainType);
    }
    if (!Object.is(prev.headerState, next.headerState)) {
      set(headerStateAtom, next.headerState);
    }
    if (!Object.is(prev.bottomState, next.bottomState)) {
      set(bottomStateAtom, next.bottomState);
    }
    if (!Object.is(prev.stationForHeader, next.stationForHeader)) {
      set(stationForHeaderAtom, next.stationForHeader);
    }
    if (!Object.is(prev.enabledLanguages, next.enabledLanguages)) {
      set(enabledLanguagesAtom, next.enabledLanguages);
    }
    if (!Object.is(prev.fetchedTrainTypes, next.fetchedTrainTypes)) {
      set(fetchedTrainTypesAtom, next.fetchedTrainTypes);
    }
    if (!Object.is(prev.autoModeEnabled, next.autoModeEnabled)) {
      set(autoModeEnabledAtom, next.autoModeEnabled);
    }
    if (!Object.is(prev.isAppLatest, next.isAppLatest)) {
      set(isAppLatestAtom, next.isAppLatest);
    }
    if (!Object.is(prev.firstStop, next.firstStop)) {
      set(firstStopAtom, next.firstStop);
    }
    if (!Object.is(prev.presetsFetched, next.presetsFetched)) {
      set(presetsFetchedAtom, next.presetsFetched);
    }
    if (!Object.is(prev.presetRoutes, next.presetRoutes)) {
      set(presetRoutesAtom, next.presetRoutes);
    }
    if (
      !Object.is(prev.pendingQuickActionRouteId, next.pendingQuickActionRouteId)
    ) {
      set(pendingQuickActionRouteIdAtom, next.pendingQuickActionRouteId);
    }
  }
);

export default navigationState;
