import { useCallback } from 'react';
import {
  type Line,
  LineType,
  type Maybe,
  type StationNumber,
} from '~/@types/graphql';
import { MARK_SHAPE } from '../constants';
import {
  getLineSymbolImage,
  getStationSymbolImagePath,
} from '../lineSymbolImage';
import type { LineMark } from '../models/LineMark';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';

export const useGetLineMark = () => {
  const getNumberingIndex = useStationNumberIndexFunc();

  const func = useCallback(
    ({
      line,
      stationNumbers = [],
      shouldGrayscale = false,
    }: {
      line: Line | undefined;
      stationNumbers: Maybe<StationNumber[]>;
      shouldGrayscale?: boolean;
    }): LineMark | null => {
      if (!line) {
        return null;
      }

      if (!line.lineSymbols?.length && line.lineType !== LineType.BulletTrain) {
        return null;
      }

      const image = getLineSymbolImage(line, shouldGrayscale);
      const firstLineSymbol = line.lineSymbols?.[0];
      const isJRLinesOmitted =
        firstLineSymbol?.shape === MARK_SHAPE.JR_UNION ||
        firstLineSymbol?.shape === MARK_SHAPE.BULLET_TRAIN_UNION;
      if (isJRLinesOmitted) {
        return {
          sign: firstLineSymbol.symbol ?? undefined,
          signShape: firstLineSymbol.shape ?? undefined,
          signPath: image?.signPath,
        };
      }

      const stationIndex = getNumberingIndex({ stationNumbers }, line);
      const number = stationNumbers?.[stationIndex];
      return {
        sign: number?.lineSymbol ?? undefined,
        signShape: number?.lineSymbolShape ?? undefined,
        signPath: getStationSymbolImagePath(line, image, number?.lineSymbol),
      };
    },
    [getNumberingIndex]
  );

  return func;
};
