import { Line } from '../models/StationAPI';
import { TrainType } from '../models/TrainType';

const getTrainType = (line: Line | undefined): TrainType => {
  if (!line) {
    return 'local';
  }
  if (line.id === 11328) {
    return 'ltdexp';
  }
  if (line.id === 11312) {
    return 'rapid';
  }
  return 'local';
};

export default getTrainType;
