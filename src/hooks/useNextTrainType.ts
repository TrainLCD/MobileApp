import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { TrainType } from '../../gen/proto/stationapi_pb';
import stationState from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';
import useCurrentTrainType from './useCurrentTrainType';

const useNextTrainType = (): TrainType | null => {
  const { stations, selectedDirection } = useRecoilValue(stationState);
  const currentStation = useCurrentStation();
  const trainType = useCurrentTrainType();

  const nextTrainType = useMemo(() => {
    if (selectedDirection === 'INBOUND') {
      const currentIndex = stations.findIndex(
        (sta) => sta.id === currentStation?.id
      );

      const slicedStations = stations.slice(currentIndex, stations.length);

      const nextTypeStation = slicedStations
        .filter((s) => s.trainType)
        .find((s) => s.trainType?.typeId !== trainType?.typeId);

      if (!nextTypeStation) {
        return null;
      }

      return new TrainType({
        ...nextTypeStation.trainType,
        line: nextTypeStation.line,
      });
    }

    const reversedStations = stations.slice().reverse();

    const currentIndex = reversedStations.findIndex(
      (sta) => sta.id === currentStation?.id
    );

    const nextTypeStation = reversedStations
      .slice(currentIndex, stations.length)
      .filter((s) => s.trainType)
      .find((s) => s.trainType?.typeId !== trainType?.typeId);

    if (!nextTypeStation) {
      return null;
    }

    return new TrainType({
      ...nextTypeStation.trainType,
      line: nextTypeStation.line,
    });
  }, [currentStation, selectedDirection, stations, trainType]);

  return nextTrainType;
};

export default useNextTrainType;
