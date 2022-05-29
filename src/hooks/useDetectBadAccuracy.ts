import { useEffect, useMemo } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import locationState from '../store/atoms/location';
import stationState from '../store/atoms/station';
import { getAvgStationBetweenDistances } from '../utils/stationDistance';
import { getArrivedThreshold } from '../utils/threshold';
import useCurrentLine from './useCurrentLine';

const useDetectBadAccuracy = (): void => {
  const { stations } = useRecoilValue(stationState);
  const [{ location }, setLocation] = useRecoilState(locationState);

  const currentLine = useCurrentLine();
  const avg = useMemo(
    () => getAvgStationBetweenDistances(stations),
    [stations]
  );

  useEffect(() => {
    const maximumAccuracy = getArrivedThreshold(currentLine?.lineType, avg);
    if (!location) {
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
  }, [location, currentLine, setLocation, stations, avg]);
};

export default useDetectBadAccuracy;
