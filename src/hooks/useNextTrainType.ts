import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { APITrainType, APITrainTypeMinimum } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import useConnectedLines from './useConnectedLines';

const useNextTrainType = (): APITrainTypeMinimum | null => {
  const { trainType } = useRecoilValue(navigationState);
  const connectedLines = useConnectedLines();
  const typedTrainType = trainType as APITrainType;
  const nextTrainType = useMemo(() => {
    const nextLine = connectedLines[0];
    return (
      typedTrainType?.allTrainTypes?.find(
        (tt) => tt.line.id === nextLine?.id
      ) ?? null
    );
  }, [connectedLines, typedTrainType?.allTrainTypes]);

  return nextTrainType;
};

export default useNextTrainType;
