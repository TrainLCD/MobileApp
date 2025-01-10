import { useMemo } from 'react';
import { getIsLocal } from '../utils/trainTypeString';
import useCurrentTrainType from './useCurrentTrainType';
import useNextTrainType from './useNextTrainType';

export const useTypeWillChange = (): boolean => {
  const trainType = useCurrentTrainType();
  const nextTrainType = useNextTrainType();

  const nextTrainTypeIsDifferent = useMemo(() => {
    if (!trainType || !nextTrainType) {
      return false;
    }

    if (
      trainType.typeId === nextTrainType.typeId ||
      trainType.name === nextTrainType.name
    ) {
      return false;
    }

    if (getIsLocal(trainType) && getIsLocal(nextTrainType)) {
      return false;
    }

    return trainType?.typeId !== nextTrainType?.typeId;
  }, [nextTrainType, trainType]);

  return nextTrainTypeIsDifferent;
};
