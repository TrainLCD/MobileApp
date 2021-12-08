import { OMIT_JR_THRESHOLD } from '../constants';
import {
  getLineMark,
  getLineMarkGrayscale,
  LineMark,
  MarkShape,
} from '../lineMark';
import { Line, LineType } from '../models/StationAPI';
import { isJRLine } from './jr';

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
    .filter((l: Line) => l.lineType !== LineType.BulletTrain);
  const bulletTrains = transferLines.filter(
    (l) => l.lineType === LineType.BulletTrain
  );
  const jrLineUnionMark = jrLines.reduce<LineMark>(
    (acc, cur) => {
      const lineMark = grayscale ? getLineMarkGrayscale(cur) : getLineMark(cur);
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
      shape: MarkShape.jrUnion,
      jrUnionSigns: [],
      jrUnionSignPaths: [],
    }
  );

  const bulletTrainUnionMarkOrigin = bulletTrains.reduce<LineMark>(
    (acc, cur) => {
      const lineMark = grayscale ? getLineMarkGrayscale(cur) : getLineMark(cur);
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
      shape: MarkShape.bulletTrainUnion,
      btUnionSigns: [],
      btUnionSignPaths: [],
    }
  );
  const bulletTrainUnionMark =
    bulletTrainUnionMarkOrigin.btUnionSignPaths || [].length > 0
      ? bulletTrainUnionMarkOrigin
      : null;
  const withoutJRLineMarks = notJRLines.map((l) =>
    grayscale ? getLineMarkGrayscale(l) : getLineMark(l)
  );
  const isJROmitted = jrLines.length >= OMIT_JR_THRESHOLD;

  const lineMarks = isJROmitted
    ? [
        ...[bulletTrainUnionMark, jrLineUnionMark].filter((m) => !!m),
        ...withoutJRLineMarks,
      ]
    : omittedTransferLines.map((l) =>
        grayscale ? getLineMarkGrayscale(l) : getLineMark(l)
      );
  return lineMarks;
};

export default getLineMarks;
