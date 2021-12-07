import { useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import lineState from '../store/atoms/line';
import locationState from '../store/atoms/location';
import stationState from '../store/atoms/station';
import { getAvgStationBetweenDistances } from '../utils/stationDistance';
import { getArrivedThreshold } from '../utils/threshold';

const useDetectBadAccuracy = (): void => {
  const { selectedLine } = useRecoilValue(lineState);
  const { stations } = useRecoilValue(stationState);
  const [{ location }, setLocation] = useRecoilState(locationState);
  useEffect(() => {
    const avg = getAvgStationBetweenDistances(stations);
    const maximumAccuracy = getArrivedThreshold(selectedLine?.lineType, avg);
    if (!location) {
      return;
    }
    if (location.coords.accuracy > maximumAccuracy) {
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
  }, [location, selectedLine, setLocation, stations]);
};

export default useDetectBadAccuracy;
