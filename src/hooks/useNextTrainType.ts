import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { APITrainType, APITrainTypeMinimum } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import useConnectedLines from './useConnectedLines';
import useNextLine from './useNextLine';

const useNextTrainType = (): APITrainTypeMinimum | null => {
  const { trainType } = useRecoilValue(navigationState);
  const connectedLines = useConnectedLines();
  const nextLine = useNextLine();
  const typedTrainType = trainType as APITrainType;
  const nextTrainType = useMemo(() => {
    return (
      typedTrainType?.allTrainTypes?.find(
        (tt) => tt.line.id === nextLine?.id
      ) ?? null
    );
  }, [connectedLines, typedTrainType?.allTrainTypes]);

  return nextTrainType;
};

export default useNextTrainType;
