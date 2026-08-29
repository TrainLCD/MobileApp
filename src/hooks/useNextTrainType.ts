import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { TrainType } from '~/@types/graphql';
import { selectedDirectionAtom, stationsAtom } from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';

export const useNextTrainType = (): TrainType | null => {
  const stations = useAtomValue(stationsAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const currentStation = useCurrentStation(true);
  const trainType = useCurrentTrainType();

  const nextTrainType = useMemo((): TrainType | null => {
    // OUTBOUND時のstationsは進行方向と逆順で保持されているため進行方向順に揃える
    const orderedStations =
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse();

    const currentIndex = orderedStations.findIndex(
      (sta) => sta.id === currentStation?.id
    );

    // NOTE: 現在駅を経路内に特定できないと進行方向より先の区間を切り出せない。
    // 経路全体を先頭から走査すると、種別が往復する直通経路(埼玉高速鉄道→相鉄本線の
    // 各駅停車→急行→各駅停車など)で既に通過した区間の種別を次の種別として拾って
    // しまうため、推定せず「次の種別なし」として扱う。
    if (currentIndex === -1) {
      return null;
    }

    const nextTypeStation = orderedStations
      .slice(currentIndex + 1)
      .filter((s) => s.trainType)
      .find((s) => s.trainType?.typeId !== trainType?.typeId);

    if (!nextTypeStation || !nextTypeStation.trainType) {
      return null;
    }

    return {
      ...nextTypeStation.trainType,
      __typename: 'TrainType' as const,
      line: nextTypeStation.line,
    };
  }, [currentStation, selectedDirection, stations, trainType]);

  return nextTrainType;
};
