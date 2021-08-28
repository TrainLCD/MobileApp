import {
  Station,
  Line,
  APITrainType,
  APITrainTypeMinimum,
} from '../models/StationAPI';
import { TrainType } from '../models/TrainType';
import getCurrentStationIndex from './currentStationIndex';
import { getIsLoopLine } from './loopLine';

type Args = {
  stations: Station[];
  arrived: boolean;
  isInbound: boolean;
  currentStation: Station;
  currentLine: Line;
  trainType: TrainType | APITrainType | APITrainTypeMinimum;
};

const getSlicedStations = ({
  stations,
  currentStation,
  currentLine,
  arrived,
  isInbound,
  trainType,
}: Args): Station[] => {
  const currentStationIndex = getCurrentStationIndex(stations, currentStation);
  if (arrived) {
    return isInbound
      ? stations.slice(currentStationIndex)
      : stations.slice(0, currentStationIndex + 1).reverse();
  }

  if (getIsLoopLine(currentLine, trainType)) {
    return isInbound
      ? stations.slice(currentStationIndex - 1)
      : stations.slice(0, currentStationIndex + 2).reverse();
  }
  return isInbound
    ? stations.slice(currentStationIndex)
    : stations.slice(0, currentStationIndex).reverse();
};

export default getSlicedStations;
