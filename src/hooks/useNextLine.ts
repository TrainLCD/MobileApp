import type { Line } from '../../gen/proto/stationapi_pb';
import { useConnectedLines } from './useConnectedLines';

export const useNextLine = (): Line | undefined => {
  const connectedLines = useConnectedLines();
  return connectedLines[0];
};
