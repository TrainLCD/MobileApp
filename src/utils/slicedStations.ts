import { Station, Line } from '../models/StationAPI';
import getCurrentStationIndex from './currentStationIndex';
import { isLoopLine } from './loopLine';

type Args = {
  stations: Station[];
  arrived: boolean;
  isInbound: boolean;
  currentStation: Station;
  currentLine: Line;
};

const getSlicedStations = ({
  stations,
  currentStation,
  currentLine,
  arrived,
  isInbound,
}: Args): Station[] => {
  const currentStationIndex = getCurrentStationIndex(stations, currentStation);
  if (arrived) {
    return isInbound
      ? stations.slice(currentStationIndex)
      : stations.slice(0, currentStationIndex + 1).reverse();
  }

  if (isLoopLine(currentLine)) {
    return isInbound
      ? stations.slice(currentStationIndex - 1)
      : stations.slice(0, currentStationIndex + 2).reverse();
  }
  return isInbound
    ? stations.slice(currentStationIndex)
    : stations.slice(0, currentStationIndex).reverse();
};

export default getSlicedStations;
