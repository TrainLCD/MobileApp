import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { APITrainType } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import { getIsLocal } from '../utils/localType';
import useConnectedLines from './useConnectedLines';
import useCurrentLine from './useCurrentLine';

const useNextOperatorTrainTypeIsDifferent = (): boolean => {
  const { trainType } = useRecoilValue(navigationState);
  const typedTrainType = trainType as APITrainType;
  const currentLine = useCurrentLine();
  const connectedLines = useConnectedLines();
  const nextLine = connectedLines[0];

  const nextTrainTypeIsDifferent = useMemo(() => {
    const currentTrainTypeIndex = typedTrainType?.allTrainTypes.findIndex(
      (tt) => tt.line.id === currentLine?.id
    );
    const currentTrainType =
      typedTrainType?.allTrainTypes[currentTrainTypeIndex];
    if (!currentTrainType) {
      return false;
    }

    const nextTrainType =
      typedTrainType.allTrainTypes.find((tt) => tt.line.id === nextLine?.id) ??
      null;

    if (!nextTrainType) {
      return false;
    }

    if (getIsLocal(currentTrainType) && getIsLocal(nextTrainType)) {
      return false;
    }

    return currentTrainType?.typeId !== nextTrainType?.typeId;
  }, [currentLine?.id, nextLine?.id, typedTrainType.allTrainTypes]);

  return nextTrainTypeIsDifferent;
};

export default useNextOperatorTrainTypeIsDifferent;
