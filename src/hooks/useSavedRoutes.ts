import { randomUUID } from 'expo-crypto';
import { useCallback } from 'react';
import type { SavedRoute, SavedRouteInput } from '~/models/SavedRoute';

const MOCK_DB: SavedRoute[] = [
  {
    id: randomUUID(),
    name: '山手線',
    lineId: 11302, // 山手線
    trainTypeId: null,
    departureStationId: 1130224, // 山手線東京駅
    destinationStationId: null,
    hasTrainType: false,
    createdAt: new Date(),
  },
  {
    id: randomUUID(),
    name: '新快速',
    lineId: 11603, // JR神戸線
    trainTypeId: 48, // 新快速
    departureStationId: 1160301, // JR神戸線大阪駅
    destinationStationId: null,
    hasTrainType: true,
    createdAt: new Date(),
  },
];

export const useSavedRoutes = () => {
  const getAll = useCallback(
    async (): Promise<SavedRoute[]> => Promise.resolve(MOCK_DB),
    []
  );
  const find = useCallback(
    async ({
      lineId,
      trainTypeId,
      destinationStationId,
    }: {
      lineId: number;
      destinationStationId: number | null;
      trainTypeId: number | null;
    }): Promise<SavedRoute | undefined> =>
      Promise.resolve(
        MOCK_DB.find((route) => {
          if (trainTypeId) {
            return (
              route.lineId === lineId &&
              route.trainTypeId === trainTypeId &&
              route.destinationStationId === destinationStationId
            );
          }

          return (
            route.lineId === lineId &&
            route.destinationStationId === destinationStationId
          );
        })
      ),
    []
  );
  const save = useCallback(
    async (route: SavedRouteInput): Promise<SavedRoute> => {
      const newRoute = { ...route, id: randomUUID(), createdAt: new Date() };
      MOCK_DB.push(newRoute);
      return Promise.resolve(newRoute);
    },
    []
  );
  const remove = useCallback(async (id: string): Promise<void> => {
    const index = MOCK_DB.findIndex((route) => route.id === id);
    if (index !== -1) {
      MOCK_DB.splice(index, 1);
    }
    return Promise.resolve();
  }, []);

  return { getAll, find, save, remove };
};
