import { useCallback } from 'react';
import { getLineMark, LineMark } from '../lineMark';
import { Line, Station } from '../models/StationAPI';

const useGetLineMark = (): ((
  station: Station,
  line: Line
) => LineMark | null) => {
  const func = useCallback((station: Station, line: Line) => {
    const lineMarkOriginal = getLineMark(line, false);

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
        signShape: lineMarkOriginal.subSignShape ?? lineMarkOriginal.signShape,
        subSign: undefined,
        subSignPath: undefined,
      } as LineMark;
    }
    if (!transferStationsSymbols.includes(lineMarkOriginal.subSign)) {
      return {
        ...lineMarkOriginal,
        signShape: lineMarkOriginal.subSignShape ?? lineMarkOriginal.signShape,
        subSign: undefined,
        subSignPath: undefined,
      } as LineMark;
    }
    return lineMarkOriginal;
  }, []);

  return func;
};

export default useGetLineMark;
