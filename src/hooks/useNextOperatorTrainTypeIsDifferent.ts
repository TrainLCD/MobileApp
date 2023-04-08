import { useMemo } from 'react';
import { getIsLocal } from '../utils/localType';
import useCurrentTrainType from './useCurrentTrainType';
import useNextTrainType from './useNextTrainType';

const useNextOperatorTrainTypeIsDifferent = (): boolean => {
  const nextTrainType = useNextTrainType();
  const currentTrainType = useCurrentTrainType();

  const nextTrainTypeIsDifferent = useMemo(() => {
    if (!currentTrainType) {
      return false;
    }

    if (!nextTrainType) {
      return false;
    }

    if (getIsLocal(currentTrainType) && getIsLocal(nextTrainType)) {
      return false;
    }

    return currentTrainType?.typeId !== nextTrainType?.typeId;
  }, [currentTrainType, nextTrainType]);

  return nextTrainTypeIsDifferent;
};

export default useNextOperatorTrainTypeIsDifferent;
