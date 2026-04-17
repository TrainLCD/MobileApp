import { useCallback } from 'react';
import {
  type Line,
  LineType,
  type Maybe,
  type StationNumber,
} from '~/@types/graphql';
import { MARK_SHAPE } from '../constants';
import { getLineSymbolImage } from '../lineSymbolImage';
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

      const firstLineSymbol = line.lineSymbols?.[0];
      const isJRLinesOmitted =
        firstLineSymbol?.shape === MARK_SHAPE.JR_UNION ||
        firstLineSymbol?.shape === MARK_SHAPE.BULLET_TRAIN_UNION;
      if (isJRLinesOmitted) {
        return {
          sign: firstLineSymbol.symbol ?? undefined,
          signShape: firstLineSymbol.shape ?? undefined,
          signPath: getLineSymbolImage(line, shouldGrayscale)?.signPath,
        };
      }

      const lineMarkMap = {
        sign: stationNumbers?.[0]?.lineSymbol ?? undefined,
        signShape: stationNumbers?.[0]?.lineSymbolShape ?? undefined,
        signPath: getLineSymbolImage(line, shouldGrayscale)?.signPath,
        subSign: stationNumbers?.[1]?.lineSymbol ?? undefined,
        subSignShape: stationNumbers?.[1]?.lineSymbolShape ?? undefined,
        subSignPath: getLineSymbolImage(line, shouldGrayscale)?.subSignPath,
        extraSign: stationNumbers?.[2]?.lineSymbol ?? undefined,
        extraSignShape: stationNumbers?.[2]?.lineSymbolShape ?? undefined,
        extraSignPath: getLineSymbolImage(line, shouldGrayscale)?.extraSignPath,
      };

      const numberingIndex =
        getNumberingIndex(line.station ?? undefined, line) ?? 0;

      if (numberingIndex === -1) {
        // 駅の stationNumbers に当該路線のシンボルが含まれていない場合
        // （例: 泉岳寺は都営浅草線所属で京急本線の KK01 が返ってこない）、
        // 路線自身の lineSymbols にフォールバックしてアイコンが消えないようにする
        const fallbackSymbol = line.lineSymbols?.[0];
        return {
          ...lineMarkMap,
          sign: fallbackSymbol?.symbol ?? lineMarkMap.sign,
          signShape: fallbackSymbol?.shape ?? lineMarkMap.signShape,
        };
      }

      const lineMark = [
        {
          sign: lineMarkMap.sign,
          signShape: lineMarkMap.signShape,
          signPath: lineMarkMap.signPath,
        },
        {
          sign: lineMarkMap.subSign ?? lineMarkMap.sign,
          signShape: lineMarkMap.subSignShape ?? lineMarkMap.signShape,
          signPath: lineMarkMap.subSignPath ?? lineMarkMap.signPath,
        },
        {
          sign:
            lineMarkMap.extraSign ?? lineMarkMap.subSign ?? lineMarkMap.sign,
          signShape:
            lineMarkMap.extraSignShape ??
            lineMarkMap.subSignShape ??
            lineMarkMap.signShape,
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
