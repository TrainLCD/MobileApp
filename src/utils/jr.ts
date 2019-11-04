import { JR_LINE_MAX_ID } from '../constants';
import { ILine, IStation } from '../models/StationAPI';

const isJRLine = (line: ILine): boolean => line.companyId <= JR_LINE_MAX_ID;

const jrCompanyColor = (companyId: number): string => {
  switch (companyId) {
    case 1: // 北海道
      return '03c13d';
    case 2: // 東日本
      return '378640';
    case 3: // 東海
      return 'ff7e1c';
    case 4: // 西日本
      return '0072ba';
    case 5: // 四国
      return '00acd1';
    case 5: // 九州
      return 'f62e36';
    default:
      return '';
  }
};
export const omitJRLinesIfThresholdExceeded = (
  allStations: IStation[],
  currentLine: ILine,
  stationIndex: number,
): ILine[] => {
  const currentStation = allStations[stationIndex];
  if (!currentLine || !currentStation) {
    return [];
  }
  const withoutCurrentLine = currentStation.lines.filter(
    (line: ILine) => line.id !== currentLine.id,
  );
  /*
  const jrLines = withoutCurrentLine.filter((line: ILine) => isJRLine(line));
  if (jrLines.length >= OMIT_JR_THRESHOLD) {
    const withoutJR = withoutCurrentLine.filter(
      (line: ILine) => !isJRLine(line),
    );
    const isTokyoStation = currentStation.groupId === 1130101;
    const lineColorC = isTokyoStation // 東京駅の１つ目の駅はJR東海（新幹線）なので
      ? jrCompanyColor(jrLines[1].companyId)
      : jrCompanyColor(jrLines[0].companyId);
    const companyId = isTokyoStation
      ? jrLines[1].companyId
      : jrLines[0].companyId;
    withoutJR.unshift({
      id: '0',
      lineColorC,
      name: 'JR線',
      companyId,
      __typename: 'Line',
    });
    return withoutJR;
  }
  */
  return withoutCurrentLine;
};

export const getCurrentStationLinesWithoutCurrentLine = (
  allStations: IStation[],
  selectedLine: ILine,
) => omitJRLinesIfThresholdExceeded(allStations, selectedLine, 0);

export const getNextStationLinesWithoutCurrentLine = (
  allStations: IStation[],
  selectedLine: ILine,
) => omitJRLinesIfThresholdExceeded(
  allStations,
  selectedLine,
  1,
);
