import { JR_LINE_MAX_ID, OMIT_JR_THRESHOLD } from '../constants';
import { Line, LINE_TYPE } from '../models/StationAPI';

export const isJRLine = (line: Line): boolean =>
  line.companyId <= JR_LINE_MAX_ID;

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

  const jrLinesWithoutBT = jrLines.filter(
    (line: Line) => line.lineType !== LINE_TYPE.BULLET_TRAIN
  );
  const jrLinesWithBT = jrLines.filter(
    (line: Line) => line.lineType === LINE_TYPE.BULLET_TRAIN
  );
  if (jrLinesWithoutBT.length >= OMIT_JR_THRESHOLD) {
    withoutJR.unshift({
      id: 1,
      lineColorC: jrCompanyColor(jrLinesWithoutBT[0].companyId),
      name: 'JR線',
      nameR: 'JR Lines',
      nameK: 'JRセン',
      lineType: LINE_TYPE.NORMAL,
      companyId: jrLinesWithoutBT[0].companyId,
      __typename: 'Line',
      nameZh: 'JR线',
      nameKo: 'JR선',
      company: {
        nameR: 'JR',
        nameEn: 'JR',
      },
      lineSymbols: [],
      transferStation: null,
    });
    if (jrLinesWithBT.length) {
      withoutJR.unshift({
        id: 0,
        lineColorC: jrCompanyColor(jrLinesWithBT[0].companyId),
        name: '新幹線',
        nameR: 'Shinkansen',
        nameK: 'シンカンセン',
        lineType: LINE_TYPE.BULLET_TRAIN,
        companyId: jrLinesWithBT[0].companyId,
        __typename: 'Line',
        nameZh: '新干线',
        nameKo: '신칸센',
        company: {
          nameR: 'JR',
          nameEn: 'JR',
        },
        lineSymbols: [],
        transferStation: null,
      });
    }
    return withoutJR;
  }
  return lines;
};

export default omitJRLinesIfThresholdExceeded;
