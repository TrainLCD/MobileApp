import {
  JR_LINE_MAX_ID,
  OMIT_JR_THRESHOLD,
  MAX_PRIVATE_COUNT_FOR_OMIT_JR,
} from '../constants';
import { LineType, Line } from '../models/StationAPI';

const isJRLine = (line: Line): boolean => line.companyId <= JR_LINE_MAX_ID;

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
    case 6: // 九州
      return 'f62e36';
    default:
      return '';
  }
};

const omitJRLinesIfThresholdExceeded = (lines: Line[]): Line[] => {
  const withoutJR = lines.filter((line: Line) => !isJRLine(line));
  const jrLines = lines.filter((line: Line) => isJRLine(line));
  if (
    (jrLines.length >= OMIT_JR_THRESHOLD ||
      withoutJR.length >= MAX_PRIVATE_COUNT_FOR_OMIT_JR) &&
    jrLines.length > 1
  ) {
    if (!jrLines.length) {
      return withoutJR;
    }
    withoutJR.unshift({
      id: 0,
      lineColorC: jrCompanyColor(jrLines[0].companyId),
      name: 'JR線',
      nameR: 'JR Lines',
      lineType: LineType.Normal,
      companyId: jrLines[0].companyId,
      __typename: 'Line',
    });
    return withoutJR;
  }
  return lines;
};

export default omitJRLinesIfThresholdExceeded;
