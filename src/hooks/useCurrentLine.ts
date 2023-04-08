import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Line } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import useCurrentStation from './useCurrentStation';

const useCurrentLine = (): Line | null => {
  const { selectedLine } = useRecoilValue(lineState);

  const currentStation = useCurrentStation();

  const currentLine = useMemo(
    () => currentStation?.currentLine || selectedLine,
    [currentStation?.currentLine, selectedLine]
  );

  return currentLine;
};

export default useCurrentLine;
