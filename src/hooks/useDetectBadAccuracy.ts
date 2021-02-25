import { useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { LineType } from '../models/StationAPI';
import { getArrivedThreshold } from '../constants';
import locationState from '../store/atoms/location';
import lineState from '../store/atoms/line';

const useDetectBadAccuracy = (): void => {
  const { selectedLine } = useRecoilValue(lineState);
  const [{ location }, setLocation] = useRecoilState(locationState);
  useEffect(() => {
    const maximumAccuracy = getArrivedThreshold(
      selectedLine ? selectedLine.lineType : LineType.Normal
    );
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
  }, [location, selectedLine, setLocation]);
};

export default useDetectBadAccuracy;
