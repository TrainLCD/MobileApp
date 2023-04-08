import { Line } from '../models/StationAPI';
import useConnectedLines from './useConnectedLines';

const useNextLine = (): Line | undefined => {
  const connectedLines = useConnectedLines();
  return connectedLines[0];
};

export default useNextLine;
