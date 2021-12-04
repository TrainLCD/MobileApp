import { useRecoilValue } from 'recoil';
import { Line } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';

const useCurrentLine = (): Line => {
  const { leftStations } = useRecoilValue(navigationState);
  const { selectedLine } = useRecoilValue(lineState);

  return leftStations[0]?.currentLine || selectedLine;
};

export default useCurrentLine;
