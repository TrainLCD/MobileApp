import { Line, Station } from '../models/StationAPI';

const isDifferentStationName = (station: Station, line: Line): boolean => {
  if (
    // line.id === 1: JR線モック
    line.id === 1
  ) {
    return false;
  }
  // nameだと市ヶ谷と市ケ谷の違い程度でも違うものとなってしまうのでよみがなで判別する
  return station.nameK !== line.transferStation?.nameK;
};

export default isDifferentStationName;
