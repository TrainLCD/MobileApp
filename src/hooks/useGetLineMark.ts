import { useCallback } from 'react';
import { getLineSymbolImage } from '../lineSymbolImage';
import { LineMark } from '../models/LineMark';
import { Line, Station } from '../models/StationAPI';

const useGetLineMark = (): ((station: Station, line: Line) => LineMark) => {
  const func = useCallback((station: Station, line: Line) => {
    const primaryMark: LineMark = {
      sign: line.lineSymbols[0]?.lineSymbol,
      signShape: line.lineSymbols[0]?.lineSymbolShape,
      signPath: getLineSymbolImage(line, false)?.signPath,
    };

    const subMark: LineMark = {
      subSign: line.lineSymbols[1]?.lineSymbol,
      subSignShape: line.lineSymbols[1]?.lineSymbolShape,
      subSignPath: getLineSymbolImage(line, false)?.subSignPath,
    };
    return { ...primaryMark, ...(subMark ?? {}) };
  }, []);

  return func;
};

export default useGetLineMark;
