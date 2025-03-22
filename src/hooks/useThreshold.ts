import { useMemo } from 'react';
import { LineType } from '../../gen/proto/stationapi_pb';
import { APPROACHING_MAX_THRESHOLD, ARRIVED_MAX_THRESHOLD } from '../constants';
import { useCurrentLine } from './useCurrentLine';

export const useThreshold = () => {
  const currentLine = useCurrentLine();

  const approachingThreshold = useMemo(() => {
    if (!currentLine) {
      return APPROACHING_MAX_THRESHOLD;
    }

    const threshold = currentLine.averageDistance / 2;
    if (threshold > APPROACHING_MAX_THRESHOLD) {
      return APPROACHING_MAX_THRESHOLD;
    }
    return threshold;
  }, [currentLine]);

  const arrivedThreshold = useMemo(() => {
    if (!currentLine) {
      return ARRIVED_MAX_THRESHOLD;
    }

    const isNarrowBetweenStation =
      currentLine.lineType === LineType.Tram ||
      currentLine.lineType === LineType.MonorailOrAGT;

    const threshold =
      currentLine.averageDistance / (isNarrowBetweenStation ? 6 : 5);
    if (threshold > ARRIVED_MAX_THRESHOLD) {
      return ARRIVED_MAX_THRESHOLD;
    }
    return threshold;
  }, [currentLine]);

  return { approachingThreshold, arrivedThreshold };
};
