import type { Line } from '~/@types/graphql';
import { LineType, TransportType } from '~/@types/graphql';
import { JR_LINE_MAX_ID, MARK_SHAPE, OMIT_JR_THRESHOLD } from '../constants';

export const isJRLine = (line: Line): boolean =>
  line.company ? (line.company.id ?? 0) <= JR_LINE_MAX_ID : false;

const jrCompanyColor = (companyId: number): string => {
  switch (companyId) {
    case 1: // 北海道
      return '#03c13d';
    case 2: // 東日本
      return '#378640';
    case 3: // 東海
      return '#ff7e1c';
    case 4: // 西日本
      return '#0072ba';
    case 5: // 四国
      return '#00acd1';
    case 6: // 九州
      return '#f62e36';
    default:
      return '';
  }
};

const omitJRLinesIfThresholdExceeded = (lines: Line[]): Line[] => {
  const withoutJR = lines.filter((line: Line) => !isJRLine(line));
  const jrLines = lines.filter((line: Line) => isJRLine(line));

  if (!withoutJR.length) {
    return jrLines;
  }

  const jrLinesWithoutBT = jrLines.filter(
    (line: Line) => line.lineType !== LineType.BulletTrain
  );
  const jrLinesWithBT = jrLines.filter(
    (line: Line) => line.lineType === LineType.BulletTrain
  );
  if (jrLinesWithoutBT.length >= OMIT_JR_THRESHOLD) {
    withoutJR.unshift({
      __typename: 'Line',
      id: 1,
      color: jrLinesWithoutBT[0].company
        ? jrCompanyColor(jrLinesWithoutBT[0].company?.id ?? 0)
        : '#000000',
      nameShort: 'JR線',
      nameRoman: 'JR Lines',
      nameKatakana: 'JRセン',
      lineType: LineType.Normal,
      nameChinese: 'JR线',
      nameKorean: 'JR선',
      nameFull: 'JR線',
      status: undefined,
      averageDistance: undefined,
      station: undefined,
      trainType: undefined,
      transportType: TransportType.Rail,
      company: {
        __typename: 'Company',
        id: 0,
        railroadId: 0,
        type: undefined,
        status: undefined,
        name: 'JR',
        nameShort: 'JR',
        nameFull: 'JR',
        nameKatakana: 'ジェイアール',
        nameEnglishShort: 'JR',
        nameEnglishFull: 'JR',
        url: undefined,
      },
      lineSymbols: [
        {
          __typename: 'LineSymbol',
          symbol: '',
          shape: MARK_SHAPE.JR_UNION,
          color: jrLinesWithoutBT[0].company
            ? jrCompanyColor(jrLinesWithoutBT[0].company?.id ?? 0)
            : '#000000',
        },
      ],
    });
    if (jrLinesWithBT.length) {
      withoutJR.unshift({
        __typename: 'Line',
        id: jrLinesWithBT[0].id,
        color: jrLinesWithBT[0].company
          ? jrCompanyColor(jrLinesWithBT[0].company?.id ?? 0)
          : '#000000',
        nameShort: '新幹線',
        nameRoman: 'Shinkansen',
        nameKatakana: 'シンカンセン',
        lineType: LineType.Normal,
        nameChinese: '新干线',
        nameKorean: '신칸센',
        nameFull: '新幹線',
        status: undefined,
        averageDistance: undefined,
        station: undefined,
        trainType: undefined,
        transportType: TransportType.Rail,
        company: {
          __typename: 'Company',
          id: 0,
          railroadId: 0,
          type: undefined,
          status: undefined,
          name: 'JR',
          nameShort: 'JR',
          nameFull: 'JR',
          nameKatakana: 'ジェイアール',
          nameEnglishShort: 'JR',
          nameEnglishFull: 'JR',
          url: undefined,
        },
        lineSymbols: [
          {
            __typename: 'LineSymbol',
            symbol: '',
            shape: MARK_SHAPE.BULLET_TRAIN_UNION,
            color: jrLinesWithoutBT[0].company
              ? jrCompanyColor(jrLinesWithoutBT[0].company?.id ?? 0)
              : '#000000',
          },
        ],
      });
    }
    return withoutJR;
  }
  return lines;
};

export default omitJRLinesIfThresholdExceeded;
