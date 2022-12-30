import { OMIT_JR_THRESHOLD } from '../constants';
import { MARK_SHAPE } from '../constants/numbering';
import { getLineMark, LineMark } from '../lineMark';
import { Line, LINE_TYPE } from '../models/StationAPI';
import { isJRLine } from './jr';

const mockJR = {
  signShape: MARK_SHAPE.REVERSED_SQUARE,
  sign: 'JR',
};

/**
 * 直接使わず、useLineMarksを使う
 */
const getLineMarks = ({
  transferLines,
  omittedTransferLines,
  grayscale,
}: {
  transferLines: Line[];
  omittedTransferLines: Line[];
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
      const lineMark = getLineMark(cur, !!grayscale);
      return {
        ...acc,
        jrUnionSigns: lineMark?.sign
          ? Array.from(new Set([...(acc.jrUnionSigns || []), lineMark.sign]))
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
      const lineMark = getLineMark(cur, !!grayscale);
      return {
        ...acc,
        btUnionSigns: lineMark?.sign
          ? Array.from(new Set([...(acc.btUnionSigns || []), lineMark.sign]))
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
    bulletTrainUnionMarkOrigin.btUnionSignPaths || [].length > 0
      ? bulletTrainUnionMarkOrigin
      : null;
  const withoutJRLineMarks = notJRLines.map((l) => getLineMark(l, !!grayscale));
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
      : omittedTransferLines.map((l) => getLineMark(l, !!grayscale))
  ).filter(
    (lm: LineMark | null) =>
      lm?.btUnionSignPaths?.length !== 0 || lm?.btUnionSigns?.length !== 0
  );
};

export default getLineMarks;
