import { useSelector, useDispatch } from 'react-redux';
import { Dispatch, useEffect } from 'react';
import { getArrivedThreshold, getApproachingThreshold } from '../constants';
import { Station, Line } from '../models/StationAPI';
import { TrainLCDAppState } from '../store';
import calcStationDistances from '../utils/stationDistance';
import { StationActionTypes } from '../store/types/station';
import {
  updateScoredStations,
  updateArrived,
  updateApproaching,
  refreshNearestStation,
} from '../store/actions/station';

const isArrived = (nearestStation: Station, currentLine: Line): boolean => {
  if (!nearestStation) {
    return false;
  }
  const ARRIVED_THRESHOLD = getArrivedThreshold(currentLine?.lineType);
  return nearestStation.distance < ARRIVED_THRESHOLD;
};

const isApproaching = (
  nextStation: Station,
  nearestStation: Station,
  currentLine: Line
): boolean => {
  if (!nextStation || !nearestStation) {
    return false;
  }
  const APPROACHING_THRESHOLD = getApproachingThreshold(currentLine?.lineType);
  // APPROACHING_THRESHOLD以上次の駅から離れている: つぎは
  // APPROACHING_THRESHOLDより近い: まもなく
  return (
    nearestStation.distance < APPROACHING_THRESHOLD &&
    nextStation.id === nearestStation.id
  );
};

const useRefreshStation = (): void => {
  const dispatch = useDispatch<Dispatch<StationActionTypes>>();
  const { stations } = useSelector((state: TrainLCDAppState) => state.station);
  const { selectedLine } = useSelector((state: TrainLCDAppState) => state.line);
  const { coords } = useSelector(
    (state: TrainLCDAppState) => state.location.location
  );
  const { leftStations } = useSelector(
    (state: TrainLCDAppState) => state.navigation
  );

  const { latitude, longitude } = coords;

  useEffect(() => {
    const scoredStations = calcStationDistances(stations, latitude, longitude);
    const nearestStation = scoredStations[0];
    const displayedNextStation = leftStations[1];
    const arrived = isArrived(nearestStation, selectedLine);
    const approaching = isApproaching(
      displayedNextStation,
      nearestStation,
      selectedLine
    );
    dispatch(updateScoredStations(scoredStations));
    dispatch(updateArrived(arrived));
    dispatch(updateApproaching(approaching));
    if (arrived) {
      dispatch(refreshNearestStation(nearestStation));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, latitude, longitude, selectedLine, stations]);
};

export default useRefreshStation;
