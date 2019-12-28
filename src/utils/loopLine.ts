import {ILine} from '../models/StationAPI';

export const isYamanoteLine = (lineId: string) => {
  return lineId === '11302';
};
export const isOsakaLoopLine = (lineId: string) => {
  return lineId === '11623';
};

export const isLoopLine = (line: ILine) => {
  if (!line) {
    return;
  }
  return isYamanoteLine(line.id) || isOsakaLoopLine(line.id);
};
