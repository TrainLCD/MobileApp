import { useMemo } from 'react';
import { LineType } from '../../gen/proto/stationapi_pb';
import { APPROACHING_MAX_THRESHOLD, ARRIVED_MAX_THRESHOLD } from '../constants';
import { useCurrentLine } from './useCurrentLine';
import { useDistanceToNextStation } from './useDistanceToNextStation';

export const useThreshold = () => {
  const currentLine = useCurrentLine();
  const distanceToNextStation = useDistanceToNextStation();

  const approachingThreshold = useMemo(() => {
    if (!currentLine) {
      return APPROACHING_MAX_THRESHOLD;
    }

    const threshold = currentLine.averageDistance / 2;
    if (threshold > APPROACHING_MAX_THRESHOLD) {
      return APPROACHING_MAX_THRESHOLD;
    }
    if (threshold > distanceToNextStation) {
      return distanceToNextStation / 2;
    }
    return threshold;
  }, [currentLine, distanceToNextStation]);

  const arrivedThreshold = useMemo(() => {
    if (!currentLine) {
      return ARRIVED_MAX_THRESHOLD;
    }

    const threshold = currentLine.averageDistance / 5;

    if (threshold > distanceToNextStation) {
      return distanceToNextStation / 5;
    }
    if (threshold > ARRIVED_MAX_THRESHOLD) {
      return ARRIVED_MAX_THRESHOLD;
    }
    return threshold;
  }, [currentLine, distanceToNextStation]);

  return { approachingThreshold, arrivedThreshold };
};
