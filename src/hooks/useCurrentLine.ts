import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Line } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import useCurrentStation from './useCurrentStation';

const useCurrentLine = (): Line | null => {
  const { stations } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);

  const currentStation = useCurrentStation();

  const currentLine = useMemo(
    () =>
      // 駅検索から取れるデータはcurrentLineが設定されていないので、駅データから探し出す必要がある
      stations.find((s) => s.currentLine.id === currentStation?.id)
        ?.currentLine || selectedLine,
    [currentStation?.id, selectedLine, stations]
  );

  return currentLine;
};

export default useCurrentLine;
