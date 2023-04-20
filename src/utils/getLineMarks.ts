import { OMIT_JR_THRESHOLD } from '../constants';
import { MARK_SHAPE } from '../constants/numbering';
import { getLineSymbolImage } from '../lineSymbolImage';
import { LineMark } from '../models/LineMark';
import { Line, LINE_TYPE, Station } from '../models/StationAPI';
import { isJRLine } from './jr';

const mockJR = {
  signShape: MARK_SHAPE.REVERSED_SQUARE,
  sign: 'JR',
};

/**
 * 直接使わず、useLineMarksを使う
 */
const getLineMarks = ({
  station,
  transferLines,
  omittedTransferLines,
  numberingIndex,
  grayscale,
}: {
  station: Station;
  transferLines: Line[];
  omittedTransferLines: Line[];
  numberingIndex: number;
  grayscale?: boolean;
}): (LineMark | null)[] => {
  const notJRLines = transferLines.filter((l) => !isJRLine(l));
  const jrLines = transferLines
    .filter((l: Line) => isJRLine(l))
    .filter((l: Line) => l.lineType !== LINE_TYPE.BULLET_TRAIN);
  const bulletTrains = transferLines.filter(
    (l) => l.lineType === LINE_TYPE.BULLET_TRAIN
  );
  const jrLineUnionMark = jrLines.reduce<LineMark>(
    (acc, cur) => {
      const lineMark = getLineSymbolImage(cur, !!grayscale);
      return {
        ...acc,
        jrUnionSigns: station.stationNumbers[numberingIndex]?.lineSymbolShape
          ? Array.from(
              new Set([
                ...(acc.jrUnionSigns || []),
                station.stationNumbers[numberingIndex]?.lineSymbolShape,
              ])
            )
          : acc.jrUnionSigns,
        jrUnionSignPaths: lineMark?.signPath
          ? Array.from(
              new Set([...(acc.jrUnionSignPaths || []), lineMark.signPath])
            )
          : acc.jrUnionSignPaths,
      };
    },
    {
      signShape: MARK_SHAPE.JR_UNION,
      jrUnionSigns: [],
      jrUnionSignPaths: [],
    }
  );

  const bulletTrainUnionMarkOrigin = bulletTrains.reduce<LineMark>(
    (acc, cur) => {
      const lineMark = getLineSymbolImage(cur, !!grayscale);
      return {
        ...acc,
        btUnionSigns: station.stationNumbers[numberingIndex]?.lineSymbolShape
          ? Array.from(
              new Set([
                ...(acc.btUnionSigns || []),
                station.stationNumbers[numberingIndex]?.lineSymbolShape,
              ])
            )
          : acc.btUnionSigns,
        btUnionSignPaths: lineMark?.signPath
          ? Array.from(
              new Set([...(acc.btUnionSignPaths || []), lineMark.signPath])
            )
          : acc.btUnionSignPaths,
      };
    },
    {
      signShape: MARK_SHAPE.BULLET_TRAIN_UNION,
      btUnionSigns: [],
      btUnionSignPaths: [],
    }
  );
  const bulletTrainUnionMark =
    (bulletTrainUnionMarkOrigin.btUnionSignPaths || []).length > 0
      ? bulletTrainUnionMarkOrigin
      : null;
  const withoutJRLineMarks = notJRLines.map((l) =>
    getLineSymbolImage(l, !!grayscale)
  );
  const isJROmitted = jrLines.length >= OMIT_JR_THRESHOLD;

  const jrLineUnionMarkWithMock =
    (jrLineUnionMark?.jrUnionSignPaths?.length || 0) === 0
      ? mockJR
      : jrLineUnionMark;

  return (
    isJROmitted
      ? [
          ...[bulletTrainUnionMark, jrLineUnionMarkWithMock].filter((m) => !!m),
          ...withoutJRLineMarks,
        ]
      : omittedTransferLines.map<LineMark | null>((l) =>
          l.lineSymbols.length || l.lineType === LINE_TYPE.BULLET_TRAIN
            ? {
                ...getLineSymbolImage(l, !!grayscale),
                signShape: l.lineSymbols[0]?.lineSymbolShape,
                sign: l.lineSymbols[0]?.lineSymbol,
              }
            : null
        )
  ).filter(
    (lm: LineMark | null) =>
      lm?.btUnionSignPaths?.length !== 0 || lm?.btUnionSigns?.length !== 0
  );
};

export default getLineMarks;
