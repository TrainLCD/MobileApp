import { parenthesisRegexp } from '../constants/regexp';
import { LineMark } from '../models/LineMark';
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
    station,
    transferLines,
    omittedTransferLines,
    grayscale,
  });

  return marks.map((original) => {
    const transferStations = station.lines
      .map((l) => l.transferStation)
      .filter((s) => !!s);
    const transferStationsSymbols = transferStations
      .flatMap((s) => s?.stationNumbers?.map((sn) => sn.lineSymbol))
      .filter((sym) => !!sym);

    if (
      !transferStationsSymbols.length ||
      !original?.sign ||
      !original?.subSign
    ) {
      return original;
    }

    if (!transferStationsSymbols.includes(original.sign)) {
      return {
        ...original,
        sign: original.subSign,
        signPath: original.subSignPath,
        subSign: undefined,
        subSignPath: undefined,
      } as LineMark;
    }
    if (!transferStationsSymbols.includes(original.subSign)) {
      return {
        ...original,
        subSign: undefined,
        subSignPath: undefined,
      } as LineMark;
    }
    return original;
  });
};

export default useLineMarks;
