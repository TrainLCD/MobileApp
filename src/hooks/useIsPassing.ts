import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import stationState from '../store/atoms/station';
import { getIsPassFromStopCondition } from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';

const useIsPassing = (): boolean => {
  const { arrived } = useRecoilValue(stationState);
  const currentStation = useCurrentStation();

  const passing = useMemo(
    () => getIsPassFromStopCondition(currentStation?.stopCondition) && arrived,
    [arrived, currentStation?.stopCondition]
  );

  return passing;
};

export default useIsPassing;
