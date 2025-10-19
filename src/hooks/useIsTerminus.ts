import { useAtomValue } from 'jotai';
import type { Station } from '~/@types/graphql';
import stationState from '../store/atoms/station';
import { useLoopLine } from './useLoopLine';

export const useIsTerminus = (station: Station | undefined) => {
  const { stations } = useAtomValue(stationState);
  const { isLoopLine } = useLoopLine();

  if (!station || isLoopLine) {
    return false;
  }

  return (
    stations[0]?.id === station.id ||
    stations[stations.length - 1]?.id === station.id
  );
};
