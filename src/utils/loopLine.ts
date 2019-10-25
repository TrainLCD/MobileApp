import { ILine } from '../models/StationAPI';

const isYamanoteLine = (lineId: string) => {
  return lineId === '11302';
}
const isOsakaLoopLine = (lineId: string) => {
  return lineId === '11623';
}

export const isLoopLine = (line: ILine) => {
  return isYamanoteLine(line.id) || isOsakaLoopLine(line.id);
};
