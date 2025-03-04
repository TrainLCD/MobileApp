import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import type { TrainType } from '../../gen/proto/stationapi_pb';
import navigationState from '../store/atoms/navigation';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';

const useCurrentTrainType = (): TrainType | null => {
  const { trainType } = useRecoilValue(navigationState);

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
    if (!getIsPass(currentStation)) {
      setCachedTrainType((prev) =>
        prev?.typeId === currentStation?.trainType?.typeId
          ? prev
          : (currentStation?.trainType ?? null)
      );
    }
  }, [currentStation]);

  return cachedTrainType;
};

export default useCurrentTrainType;
