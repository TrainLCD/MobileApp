import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Line } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';

const useCurrentLine = (): Line | null => {
  const { rawStations, selectedDirection } = useRecoilValue(stationState);
  const { leftStations } = useRecoilValue(navigationState);
  const { selectedLine } = useRecoilValue(lineState);

  // 副都心線を選択しているのに次の駅到着まで東横線になるバグに対する対処
  // 副都心線に限らずデータ上直通運転が設定されているすべての駅で発生していたはず
  const actualCurrentStation = useMemo(
    () =>
      (selectedDirection === 'INBOUND'
        ? rawStations.slice().reverse()
        : rawStations
      ).find((rs) => rs.groupId === leftStations[0]?.groupId),
    [leftStations, rawStations, selectedDirection]
  );

  const currentLine = useMemo(
    () => actualCurrentStation?.currentLine || selectedLine,
    [actualCurrentStation?.currentLine, selectedLine]
  );

  return currentLine;
};

export default useCurrentLine;
