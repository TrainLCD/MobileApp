import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { TrainType } from '~/@types/graphql';
import stationState from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';

export const useNextTrainType = (): TrainType | null => {
  const { stations, selectedDirection } = useAtomValue(stationState);
  const currentStation = useCurrentStation(true);
  const trainType = useCurrentTrainType();

  const nextTrainType = useMemo((): TrainType | null => {
    if (selectedDirection === 'INBOUND') {
      const currentIndex = stations.findIndex(
        (sta) => sta.id === currentStation?.id
      );

      const slicedStations = stations.slice(currentIndex + 1, stations.length);

      const nextTypeStation = slicedStations
        .filter((s) => s.trainType)
        .find((s) => s.trainType?.typeId !== trainType?.typeId);

      if (!nextTypeStation || !nextTypeStation.trainType) {
        return null;
      }

      return {
        ...nextTypeStation.trainType,
        __typename: 'TrainType' as const,
        line: nextTypeStation.line,
      };
    }

    const reversedStations = stations.slice().reverse();

    const currentIndex = reversedStations.findIndex(
      (sta) => sta.id === currentStation?.id
    );

    const nextTypeStation = reversedStations
      .slice(currentIndex + 1, stations.length)
      .filter((s) => s.trainType)
      .find((s) => s.trainType?.typeId !== trainType?.typeId);

    if (!nextTypeStation || !nextTypeStation.trainType) {
      return null;
    }

    return {
      ...nextTypeStation.trainType,
      __typename: 'TrainType' as const,
      line: nextTypeStation.line,
    };
  }, [currentStation, selectedDirection, stations, trainType]);

  return nextTrainType;
};
