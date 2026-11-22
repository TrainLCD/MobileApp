import { randomUUID } from 'expo-crypto';
import { useAtomValue, useStore } from 'jotai';
import { useCallback, useEffect } from 'react';
import {
  migrateSavedRoutes,
  readSavedRoutes,
  writeSavedRoutes,
} from '~/lib/savedRoutesStorage';
import type {
  SavedRoute,
  SavedRouteInput,
  SavedRouteLeg,
} from '~/models/SavedRoute';
import { presetRoutesAtom, presetsFetchedAtom } from '~/store/atoms/navigation';
import { isSameSavedRouteLegs } from '~/utils/transferRoutePreset';

export const useSavedRoutes = () => {
  const routes = useAtomValue(presetRoutesAtom);
  const isInitialized = useAtomValue(presetsFetchedAtom);
  const store = useStore();

  const updateRoutes = useCallback(async (): Promise<void> => {
    if (store.get(presetsFetchedAtom)) return;
    let saved = readSavedRoutes();
    if (saved === null) {
      await migrateSavedRoutes();
      // 別の呼び出しが初期化・保存を済ませていれば古い読み取りで上書きしない。
      if (store.get(presetsFetchedAtom)) return;
      saved = readSavedRoutes();
    }
    if (saved === null)
      throw new Error('Saved routes migration did not complete');
    store.set(presetRoutesAtom, saved);
    store.set(presetsFetchedAtom, true);
  }, [store]);

  useEffect(() => {
    updateRoutes().catch((error) => {
      console.error(
        'useSavedRoutes: プリセットの読み込みに失敗しました',
        error
      );
    });
  }, [updateRoutes]);

  const find = useCallback(
    ({
      lineId,
      trainTypeId,
      wantedDestinationId,
      legs,
    }: {
      lineId: number | null;
      trainTypeId: number | null;
      wantedDestinationId: number | null;
      /** 乗換のある経路の区間。指定すると区間が同じプリセットだけを探す */
      legs?: SavedRouteLeg[] | null;
    }): SavedRoute | null => {
      if (legs) {
        return (
          routes.find(
            (r) =>
              r.hasTrainType &&
              !!r.legs &&
              isSameSavedRouteLegs(r.legs, legs) &&
              r.wantedDestinationId === wantedDestinationId
          ) ?? null
        );
      }
      if (trainTypeId !== null) {
        // 種別指定で検索する場合、trainTypeId（lineGroupId）のみで一意に識別できる
        // lineIdは経路の中間駅で異なる可能性があるため比較しない
        return (
          routes.find(
            (r) =>
              r.hasTrainType &&
              // 乗換経路のプリセットは最初の区間の系統を持つが、その系統だけの経路とは別物
              !r.legs &&
              r.trainTypeId === trainTypeId &&
              r.wantedDestinationId === wantedDestinationId
          ) ?? null
        );
      }
      // trainTypeId === null の場合は lineId が必須
      if (lineId === null) {
        return null;
      }
      // lineId が一致し、hasTrainType: false の経路を検索
      return (
        routes.find(
          (r) =>
            r.lineId === lineId &&
            !r.hasTrainType &&
            r.wantedDestinationId === wantedDestinationId
        ) ?? null
      );
    },
    [routes]
  );

  const save = useCallback(
    async (route: SavedRouteInput): Promise<SavedRoute> => {
      await updateRoutes();
      const newRoute = {
        ...route,
        trainTypeId: route.hasTrainType ? route.trainTypeId : null,
        id: randomUUID(),
        createdAt: new Date(),
      } as SavedRoute;
      const next = [newRoute, ...store.get(presetRoutesAtom)];
      // 永続化が成功してから画面・ウィジェットへ通知する。
      writeSavedRoutes(next);
      store.set(presetRoutesAtom, next);
      return newRoute;
    },
    [store, updateRoutes]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await updateRoutes();
      const next = store.get(presetRoutesAtom).filter((r) => r.id !== id);
      writeSavedRoutes(next);
      store.set(presetRoutesAtom, next);
    },
    [store, updateRoutes]
  );

  return { isInitialized, routes, updateRoutes, find, save, remove };
};
