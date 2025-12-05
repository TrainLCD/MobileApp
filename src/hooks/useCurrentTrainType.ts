import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import type { Station, TrainType } from '~/@types/graphql';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';

export const useCurrentTrainType = (): TrainType | null => {
  const { stations } = useAtomValue(stationState);
  const { trainType } = useAtomValue(navigationState);

  const currentStation = useCurrentStation(true);
  const currentLine = useCurrentLine();

  const [cachedTrainType, setCachedTrainType] = useState(
    currentStation?.trainType ?? trainType
  );

  useEffect(() => {
    if (!trainType) {
      setCachedTrainType(null);
    }
  }, [trainType]);

  useEffect(() => {
    // NOTE: 選択した路線と選択した種別に紐づいている路線が違う時に選んだ方面の種別と合わせる処理
    // 例として渋谷駅で東横線選んで特急種別を選んだ後、同一種別の存在しないメトロ線方面を選んだ等;
    if (currentStation?.line?.id !== currentLine?.id) {
      const actualTrainType = stations.find(
        (s: Station) => s?.id === currentLine?.station?.id
      )?.trainType;
      setCachedTrainType((prev: TrainType | null) =>
        prev?.typeId === actualTrainType?.typeId
          ? prev
          : (actualTrainType ?? null)
      );
      return;
    }

    if (!getIsPass(currentStation)) {
      setCachedTrainType((prev: TrainType | null) =>
        prev?.typeId === currentStation?.trainType?.typeId
          ? prev
          : (currentStation?.trainType ?? null)
      );
    }
  }, [currentStation, currentLine, stations]);

  return cachedTrainType;
};
