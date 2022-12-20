import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Line } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import useCurrentStation from './useCurrentStation';

const useCurrentLine = (): Line | null => {
  const { stations, selectedDirection } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);

  const currentStation = useCurrentStation();

  // 副都心線を選択しているのに次の駅到着まで東横線になるバグに対する対処
  // 副都心線に限らずデータ上直通運転が設定されているすべての駅で発生していたはず
  const actualCurrentStation = useMemo(
    () =>
      (selectedDirection === 'INBOUND'
        ? stations.slice().reverse()
        : stations
      ).find(
        (rs) =>
          rs.groupId === currentStation?.groupId &&
          rs.currentLine?.id &&
          currentStation?.currentLine?.id
      ),
    [
      currentStation?.currentLine?.id,
      currentStation?.groupId,
      stations,
      selectedDirection,
    ]
  );

  const currentLine = useMemo(
    () => actualCurrentStation?.currentLine || selectedLine,
    [actualCurrentStation?.currentLine, selectedLine]
  );

  return currentLine;
};

export default useCurrentLine;
