import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import stationState from '../store/atoms/station';
import getCurrentStationIndex from '../utils/currentStationIndex';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';

export const useSlicedStations = (): Station[] => {
  const { stations, arrived, selectedDirection } = useAtomValue(stationState);

  const currentStation = useCurrentStation();
  const { isLoopLine } = useLoopLine();

  const isInbound = useMemo(
    () => selectedDirection === 'INBOUND',
    [selectedDirection]
  );

  const slicedStations = useMemo((): Station[] => {
    const currentStationIndex = getCurrentStationIndex(
      stations,
      currentStation
    );
    if (arrived) {
      return isInbound
        ? stations.slice(currentStationIndex)
        : stations.slice(0, currentStationIndex + 1).reverse();
    }

    if (isLoopLine) {
      // 山手線 品川 大阪環状線 寺田町
      if (stations.length - 1 === currentStationIndex) {
        return isInbound
          ? stations.slice(0, currentStationIndex).reverse()
          : stations.slice(0, currentStationIndex);
      }
      // 山手線 大崎 大阪環状線 天王寺
      if (currentStationIndex === 0) {
        return isInbound
          ? stations.slice(currentStationIndex).reverse()
          : stations.slice(currentStationIndex);
      }
      return isInbound
        ? stations.slice(0, currentStationIndex).reverse()
        : stations.slice(currentStationIndex);
    }

    if (currentStationIndex === 0) {
      return stations.slice(1);
    }

    return isInbound
      ? stations.slice(currentStationIndex)
      : stations.slice(0, currentStationIndex).reverse();
  }, [arrived, currentStation, isInbound, isLoopLine, stations]);

  return slicedStations;
};
