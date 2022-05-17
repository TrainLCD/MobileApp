import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { APITrainType } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { getIsLocal } from '../utils/localType';
import useCurrentLine from './useCurrentLine';

const useNextTrainTypeIsDifferent = (): boolean => {
  const { trainType } = useRecoilValue(navigationState);
  const { selectedDirection } = useRecoilValue(stationState);

  const typedTrainType = trainType as APITrainType;
  const currentLine = useCurrentLine();

  const nextTrainTypeIsDifferent = useMemo(() => {
    const currentTrainTypeIndex = typedTrainType?.allTrainTypes.findIndex(
      (tt) => tt.line.id === currentLine?.id
    );
    const currentTrainType =
      typedTrainType?.allTrainTypes[currentTrainTypeIndex];
    if (!currentTrainType) {
      return false;
    }

    if (selectedDirection === 'INBOUND') {
      const nextTrainType =
        typedTrainType?.allTrainTypes[currentTrainTypeIndex + 1];
      if (!nextTrainType) {
        return false;
      }

      if (getIsLocal(currentTrainType) && getIsLocal(nextTrainType)) {
        return false;
      }

      return currentTrainType?.typeId !== nextTrainType?.typeId;
    }
    const nextTrainType =
      typedTrainType?.allTrainTypes[currentTrainTypeIndex - 1];

    if (!nextTrainType) {
      return false;
    }

    if (getIsLocal(currentTrainType) && getIsLocal(nextTrainType)) {
      return false;
    }

    return currentTrainType?.typeId !== nextTrainType?.typeId;
  }, [currentLine?.id, selectedDirection, typedTrainType?.allTrainTypes]);

  return nextTrainTypeIsDifferent;
};

export default useNextTrainTypeIsDifferent;
