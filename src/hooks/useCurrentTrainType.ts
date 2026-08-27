import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { trainTypeAtom } from '../store/atoms/navigation';
import { stationsAtom } from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';

// NOTE: APIは系統内の「停車駅」にしか種別を紐づけないため、通過駅のtrainTypeは常にnullで返る。
// そのため現在地の駅を直接引くだけだと、通過駅を走行している間だけ種別が失われてしまう。
// 同一路線上で種別を持つ(=停車する)駅から引き直すことで種別を維持する。
// 系統によっては同じ路線の途中で種別が変わるものがあるので、
// 現在地から前後に近い駅を優先して探索する。
const findTrainTypeOnLine = (
  stations: Station[],
  line: Line | null
): TrainType | null => {
  if (!line) {
    return null;
  }

  const originIndex = stations.findIndex((s) => s?.id === line.station?.id);
  if (originIndex === -1) {
    return null;
  }

  const originTrainType = stations[originIndex]?.trainType;
  if (originTrainType) {
    return originTrainType;
  }

  for (let offset = 1; offset < stations.length; offset++) {
    const behind = stations[originIndex - offset];
    if (behind?.line?.id === line.id && behind.trainType) {
      return behind.trainType;
    }
    const ahead = stations[originIndex + offset];
    if (ahead?.line?.id === line.id && ahead.trainType) {
      return ahead.trainType;
    }
  }

  return null;
};

export const useCurrentTrainType = (): TrainType | null => {
  const stations = useAtomValue(stationsAtom);
  const trainType = useAtomValue(trainTypeAtom);

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
      const actualTrainType = findTrainTypeOnLine(stations, currentLine);
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
