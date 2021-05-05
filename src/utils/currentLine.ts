import { Line, Station } from '../models/StationAPI';

const getCurrentLine = (
  leftStations: Station[],
  joinedLineIds: number[] | undefined,
  selectedLine: Line
): Line =>
  leftStations.map((s) =>
    s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
  )[0] || selectedLine;
export default getCurrentLine;
