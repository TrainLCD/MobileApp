import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Line } from '~/@types/graphql';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';

export const useCurrentLine = (): Line | null => {
  const { stations, selectedDirection } = useAtomValue(stationState);
  const { selectedLine } = useAtomValue(lineState);
  const currentStation = useCurrentStation();

  const actualCurrentStation = useMemo(
    () =>
      (selectedDirection === 'INBOUND'
        ? stations.slice().reverse()
        : stations
      ).find((rs) => rs.groupId === currentStation?.groupId),
    [currentStation?.groupId, selectedDirection, stations]
  );

  // NOTE: selectedLineがnullishの時はcurrentLineもnullishであってほしい
  return (selectedLine && actualCurrentStation?.line) ?? null;
};
