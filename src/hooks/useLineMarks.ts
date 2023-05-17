import { parenthesisRegexp } from '../constants/regexp';
import { LineResponse, StationResponse } from '../gen/stationapi_pb';
import { LineMark } from '../models/LineMark';
import getLineMarks from '../utils/getLineMarks';
import omitJRLinesIfThresholdExceeded from '../utils/jr';
import useStationNumberIndexFunc from './useStationNumberIndexFunc';

const useLineMarks = ({
  transferLines,
  grayscale,
  station,
}: {
  station: StationResponse.AsObject;
  transferLines: LineResponse.AsObject[];
  grayscale?: boolean;
}): (LineMark | null)[] => {
  const omittedTransferLines = omitJRLinesIfThresholdExceeded(
    transferLines
  ).map((l) => ({
    ...l,
    name: l.nameShort.replace(parenthesisRegexp, ''),
    nameR: l.nameRoman.replace(parenthesisRegexp, ''),
  }));

  const getStationNumberIndex = useStationNumberIndexFunc();
  const numberingIndex = getStationNumberIndex(station.stationNumbersList);

  const marks = getLineMarks({
    station,
    transferLines,
    omittedTransferLines,
    grayscale,
    numberingIndex,
  });

  return marks.map((original) => {
    const transferStations = station.linesList
      .map((l) => l.station)
      .filter((s) => !!s);
    const transferStationsSymbols = transferStations
      .flatMap((s) => s?.stationNumbersList?.map((sn) => sn.lineSymbol))
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
    if (!transferStationsSymbols.includes(original.extraSign)) {
      return {
        ...original,
        extraSign: undefined,
        extraSignPath: undefined,
      } as LineMark;
    }
    return original;
  });
};

export default useLineMarks;
