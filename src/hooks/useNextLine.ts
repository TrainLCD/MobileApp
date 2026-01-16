import type { Line } from '~/@types/graphql';
import { useConnectedLines } from './useConnectedLines';

export const useNextLine = (): Line | undefined => {
  const connectedLines = useConnectedLines();
  return connectedLines[0];
};
