import { useEffect, Dispatch } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LocationActionTypes } from '../store/types/location';
import { TrainLCDAppState } from '../store';
import { LineType } from '../models/StationAPI';
import { getArrivedThreshold } from '../constants';
import { updateBadAccuracy } from '../store/actions/location';

const useDetectBadAccuracy = (): void => {
  const dispatch = useDispatch<Dispatch<LocationActionTypes>>();
  const { selectedLine } = useSelector((state: TrainLCDAppState) => state.line);
  const { location } = useSelector((state: TrainLCDAppState) => state.location);
  useEffect(() => {
    const maximumAccuracy = getArrivedThreshold(
      selectedLine ? selectedLine.lineType : LineType.Normal
    );
    if (!location) {
      return;
    }
    if (location.coords.accuracy > maximumAccuracy) {
      dispatch(updateBadAccuracy(true));
    } else {
      dispatch(updateBadAccuracy(false));
    }
  }, [dispatch, location, selectedLine]);
};

export default useDetectBadAccuracy;
