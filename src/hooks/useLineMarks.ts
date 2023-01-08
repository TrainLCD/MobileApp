import { parenthesisRegexp } from '../constants/regexp';
import { LineMark } from '../lineMark';
import { Line, Station } from '../models/StationAPI';
import getLineMarks from '../utils/getLineMarks';
import omitJRLinesIfThresholdExceeded from '../utils/jr';

const useLineMarks = ({
  transferLines,
  grayscale,
  station,
}: {
  station: Station;
  transferLines: Line[];
  grayscale?: boolean;
}): (LineMark | null)[] => {
  const omittedTransferLines = omitJRLinesIfThresholdExceeded(
    transferLines
  ).map((l) => ({
    ...l,
    name: l.name.replace(parenthesisRegexp, ''),
    nameR: l.nameR.replace(parenthesisRegexp, ''),
  }));

  const marks = getLineMarks({
    transferLines,
    omittedTransferLines,
    grayscale,
  });

  return marks.map((lineMarkOriginal) => {
    const transferStations = station.lines
      .map((l) => l.transferStation)
      .filter((s) => !!s);
    const transferStationsSymbols = transferStations
      .flatMap((s) => s?.stationNumbers?.map((sn) => sn.lineSymbol))
      .filter((sym) => !!sym);

    if (
      !transferStationsSymbols.length ||
      !lineMarkOriginal?.sign ||
      !lineMarkOriginal?.subSign
    ) {
      return lineMarkOriginal;
    }

    if (!transferStationsSymbols.includes(lineMarkOriginal.sign)) {
      return {
        ...lineMarkOriginal,
        sign: lineMarkOriginal.subSign,
        signPath: lineMarkOriginal.subSignPath,
        subSign: undefined,
        subSignPath: undefined,
      } as LineMark;
    }
    if (!transferStationsSymbols.includes(lineMarkOriginal.subSign)) {
      return {
        ...lineMarkOriginal,
        subSign: undefined,
        subSignPath: undefined,
      } as LineMark;
    }
    return lineMarkOriginal;
  });
};

export default useLineMarks;
