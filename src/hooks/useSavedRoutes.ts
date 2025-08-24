import { useCallback } from 'react';
import type { SavedRoute, SavedRouteInput } from '~/models/SavedRoute';

export const useSavedRoutes = () => {
  const getAll = useCallback(
    async (): Promise<SavedRoute[]> => Promise.resolve([]),
    []
  );
  const find = useCallback(
    async ({
      lineId: _lineId,
      trainTypeId: _trainTypeId,
    }: {
      lineId?: number;
      trainTypeId?: number;
    }): Promise<SavedRoute | undefined> => Promise.resolve(undefined),
    []
  );
  const save = useCallback(
    async (_route: SavedRouteInput): Promise<void> => Promise.resolve(),
    []
  );
  const remove = useCallback(
    async (_id: string): Promise<void> => Promise.resolve(),
    []
  );

  return { getAll, find, save, remove };
};
