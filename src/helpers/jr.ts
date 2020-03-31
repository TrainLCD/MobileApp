import { JR_LINE_MAX_ID, OMIT_JR_THRESHOLD } from '../constants';
import { ILine, LineType } from '../models/StationAPI';

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

export const omitJRLinesIfThresholdExceeded = (lines: ILine[]) => {
  const withoutJR = lines.filter(
    (line: ILine) => !isJRLine(line),
  );
  const jrLines = lines.filter((line: ILine) => isJRLine(line));
  if (jrLines.length >= OMIT_JR_THRESHOLD) {
    withoutJR.unshift({
      id: '0',
      lineColorC: jrCompanyColor(jrLines[0].companyId),
      name: 'JR線',
      nameK: 'JRセン',
      lineType: LineType.Normal,
      companyId: jrLines[0].companyId,
      __typename: 'Line',
    });
    return withoutJR;
  }
  return withoutJR;
};
