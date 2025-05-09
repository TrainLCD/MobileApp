import { useCallback } from 'react';
import { type Line, LineType } from '../../gen/proto/stationapi_pb';
import { MARK_SHAPE } from '../constants';
import { getLineSymbolImage } from '../lineSymbolImage';
import type { LineMark } from '../models/LineMark';
import useStationNumberIndexFunc from './useStationNumberIndexFunc';

const useGetLineMark = () => {
  const getNumberingIndex = useStationNumberIndexFunc();

  const func = useCallback(
    ({
      line,
      shouldGrayscale = false,
    }: {
      line: Line | undefined;
      shouldGrayscale?: boolean;
    }): LineMark | null => {
      if (!line) {
        return null;
      }

      if (!line.lineSymbols?.length && line.lineType !== LineType.BulletTrain) {
        return null;
      }

      const firstLineSymbol = line.lineSymbols?.[0];
      const isJRLinesOmitted =
        firstLineSymbol?.shape === MARK_SHAPE.JR_UNION ||
        firstLineSymbol?.shape === MARK_SHAPE.BULLET_TRAIN_UNION;
      if (isJRLinesOmitted) {
        return {
          sign: firstLineSymbol.symbol,
          signShape: firstLineSymbol.shape,
          signPath: getLineSymbolImage(line, shouldGrayscale)?.signPath,
        };
      }

      const lineMarkMap = {
        sign: line.lineSymbols?.[0]?.symbol,
        signShape: line.lineSymbols?.[0]?.shape,
        signPath: getLineSymbolImage(line, shouldGrayscale)?.signPath,
        subSign: line.lineSymbols?.[1]?.symbol,
        subSignShape: line.lineSymbols?.[1]?.shape,
        subSignPath: getLineSymbolImage(line, shouldGrayscale)?.subSignPath,
        extraSign: line.lineSymbols?.[2]?.symbol,
        extraSignShape: line.lineSymbols?.[2]?.shape,
        extraSignPath: getLineSymbolImage(line, shouldGrayscale)?.extraSignPath,
      };

      const numberingIndex = getNumberingIndex(line.station, line) ?? 0;

      if (numberingIndex === -1) {
        return lineMarkMap;
      }

      const lineMark = [
        {
          sign: lineMarkMap.sign,
          signShape: lineMarkMap.signShape,
          signPath: lineMarkMap.signPath,
        },
        {
          sign: lineMarkMap.subSign,
          signShape: lineMarkMap.subSignShape,
          signPath: lineMarkMap.subSignPath ?? lineMarkMap.signPath,
        },
        {
          sign: lineMarkMap.extraSign,
          signShape: lineMarkMap.extraSignShape,
          signPath:
            lineMarkMap.extraSignPath ??
            lineMarkMap.subSignPath ??
            lineMarkMap.signPath,
        },
      ][numberingIndex];

      return lineMark;
    },
    [getNumberingIndex]
  );

  return func;
};

export default useGetLineMark;
