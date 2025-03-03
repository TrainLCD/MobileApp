import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { type TrainType, TrainTypeKind } from '../../gen/proto/stationapi_pb';
import navigationState from '../store/atoms/navigation';
import { useCurrentStation } from './useCurrentStation';
import getIsPass from '../utils/isPass';

const useCurrentTrainType = (): TrainType | null => {
  const { trainType, fromBuilder } = useRecoilValue(navigationState);

  const currentStation = useCurrentStation();

  const [cachedTrainType, setCachedTrainType] = useState(
    currentStation?.trainType ?? trainType
  );

  useEffect(() => {
    if (!trainType) {
      setCachedTrainType(null);
    }
  }, [trainType]);

  useEffect(() => {
    if (
      ((trainType?.lines?.length ?? 1) > 1 ||
        trainType?.kind === TrainTypeKind.Branch) &&
      !fromBuilder &&
      !getIsPass(currentStation)
    ) {
      setCachedTrainType(currentStation?.trainType ?? null);
    }
  }, [currentStation, fromBuilder, trainType]);

  return cachedTrainType;
};

export default useCurrentTrainType;
