import { Line, Station } from '../models/StationAPI';

const isDifferentStationName = (station: Station, line: Line): boolean => {
  if (
    // line.id === 1: JR線モック
    line.id === 1
  ) {
    return false;
  }
  return station.name !== line.transferStation?.name;
};

export default isDifferentStationName;
