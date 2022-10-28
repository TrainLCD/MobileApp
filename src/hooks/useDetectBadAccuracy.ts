import { useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import locationState from '../store/atoms/location';
import stationState from '../store/atoms/station';
import { getArrivedThreshold } from '../utils/threshold';
import useAverageDistance from './useAverageDistance';
import useCurrentLine from './useCurrentLine';

const useDetectBadAccuracy = (): void => {
  const { stations } = useRecoilValue(stationState);
  const [{ location }, setLocation] = useRecoilState(locationState);

  const currentLine = useCurrentLine();
  const avgDistance = useAverageDistance();

  useEffect(() => {
    const maximumAccuracy = getArrivedThreshold(
      currentLine?.lineType,
      avgDistance
    );
    if (!location?.coords?.accuracy) {
      return;
    }
    if ((location.coords.accuracy || 0) > maximumAccuracy) {
      setLocation((prev) => ({
        ...prev,
        badAccuracy: true,
      }));
    } else {
      setLocation((prev) => ({
        ...prev,
        badAccuracy: false,
      }));
    }
  }, [
    location?.coords?.accuracy,
    currentLine,
    setLocation,
    stations,
    avgDistance,
  ]);
};

export default useDetectBadAccuracy;
