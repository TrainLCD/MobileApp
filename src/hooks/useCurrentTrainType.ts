import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { type TrainType, TrainTypeKind } from '../../gen/proto/stationapi_pb';
import navigationState from '../store/atoms/navigation';
import { useCurrentStation } from './useCurrentStation';

const useCurrentTrainType = (): TrainType | null => {
  const { trainType, fromBuilder } = useRecoilValue(navigationState);

  const currentStation = useCurrentStation();

  const currentTrainType = useMemo(
    () =>
      ((trainType?.lines?.length ?? 1) > 1 ||
        trainType?.kind === TrainTypeKind.Branch) &&
      !fromBuilder
        ? currentStation?.trainType
        : (trainType ?? null),
    [currentStation, fromBuilder, trainType]
  );

  return currentTrainType ?? null;
};

export default useCurrentTrainType;
