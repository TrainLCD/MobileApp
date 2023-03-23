import { useCallback } from 'react';
import { getLineSymbolImage } from '../lineSymbolImage';
import { LineMark } from '../models/LineMark';
import { Line, Station } from '../models/StationAPI';

type LineMarkWithCurrentLineMark = LineMark & {
  currentLineMark: LineMark | null;
};

const useGetLineMark = (): ((
  station: Station,
  line: Line
) => LineMarkWithCurrentLineMark | null) => {
  const func = useCallback((station: Station, line: Line) => {
    if (!line) {
      return null;
    }

    const lineMarkMap = {
      sign: line.lineSymbols[0]?.lineSymbol,
      signShape: line.lineSymbols[0]?.lineSymbolShape,
      signPath: getLineSymbolImage(line, false)?.signPath,
      subSign: line.lineSymbols[1]?.lineSymbol,
      subSignShape: line.lineSymbols[1]?.lineSymbolShape,
      subSignPath: getLineSymbolImage(line, false)?.subSignPath,
      extraSign: line.lineSymbols[2]?.lineSymbol,
      extraSignShape: line.lineSymbols[2]?.lineSymbolShape,
      extraSignPath: getLineSymbolImage(line, false)?.extraSignPath,
    };

    const lineMarkList = [
      {
        sign: lineMarkMap.sign,
        signShape: lineMarkMap.signShape,
        signPath: lineMarkMap.signPath,
      },
      {
        sign: lineMarkMap.subSign,
        signShape: lineMarkMap.subSignShape,
        signPath: lineMarkMap.subSignPath,
      },
      {
        sign: lineMarkMap.extraSign,
        signShape: lineMarkMap.extraSignShape,
        signPath: lineMarkMap.extraSignPath,
      },
    ];
    const lineMarkIndex = [
      lineMarkMap?.sign,
      lineMarkMap?.subSign,
      lineMarkMap?.extraSign,
    ].findIndex((sign) => station.stationNumbers[0]?.lineSymbol === sign);

    const currentLineMark = lineMarkList[lineMarkIndex];

    return { ...lineMarkMap, currentLineMark };
  }, []);

  return func;
};

export default useGetLineMark;
