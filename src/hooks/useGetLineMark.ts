import { useCallback } from 'react';
import { MARK_SHAPE, MarkShape, MarkShapeKey } from '../constants/numbering';
import { LineResponse, LineType, StationResponse } from '../gen/stationapi_pb';
import { getLineSymbolImage } from '../lineSymbolImage';
import { LineMark } from '../models/LineMark';

type LineMarkWithCurrentLineMark = LineMark & {
  currentLineMark: LineMark | null;
};

const useGetLineMark = (): (({
  station,
  line,
}: {
  numberingIndex?: number;
  station?: StationResponse.AsObject | undefined;
  line: LineResponse.AsObject;
}) => LineMarkWithCurrentLineMark | null) => {
  const func = useCallback(
    ({
      numberingIndex = 0,
      station,
      line,
    }: {
      numberingIndex?: number;
      station?: StationResponse.AsObject;
      line: LineResponse.AsObject;
    }): LineMarkWithCurrentLineMark | null => {
      const lineSymbols = line?.lineSymbolsList;
      if (!lineSymbols?.length && line?.lineType !== LineType.BULLETTRAIN) {
        return null;
      }

      const lineMarkMap = {
        sign: lineSymbols[0]?.symbol,
        signShape: lineSymbols[0]?.shape as MarkShape | undefined,
        signPath: getLineSymbolImage(line, false)?.signPath,
        subSign: lineSymbols[1]?.symbol,
        subSignShape: lineSymbols[1]?.shape as MarkShape | undefined,
        subSignPath: getLineSymbolImage(line, false)?.subSignPath,
        extraSign: lineSymbols[2]?.symbol,
        extraSignShape: lineSymbols[2]?.shape as MarkShape | undefined,
        extraSignPath: getLineSymbolImage(line, false)?.extraSignPath,
      };

      const lineMarkList: LineMark[] = [
        {
          sign: lineMarkMap.sign,
          signShape: MARK_SHAPE[
            lineMarkMap.signShape as MarkShapeKey
          ] as MarkShape,
          signPath: lineMarkMap.signPath,
        },
        {
          sign: lineMarkMap.subSign,
          signShape: MARK_SHAPE[
            lineMarkMap.subSignShape as MarkShapeKey
          ] as MarkShape,
          signPath: lineMarkMap.subSignPath,
        },
        {
          sign: lineMarkMap.extraSign,
          signShape: MARK_SHAPE[
            lineMarkMap.extraSignShape as MarkShapeKey
          ] as MarkShape,
          signPath: lineMarkMap.extraSignPath,
        },
      ];

      const lineMarkIndex = [
        lineMarkMap?.sign,
        lineMarkMap?.subSign,
        lineMarkMap?.extraSign,
      ].findIndex((sign) =>
        station
          ? station?.stationNumbersList[numberingIndex]?.lineSymbol === sign
          : line.station?.stationNumbersList[numberingIndex]?.lineSymbol ===
            sign
      );

      return { ...lineMarkMap, currentLineMark: lineMarkList[lineMarkIndex] };
    },
    []
  );

  return func;
};

export default useGetLineMark;
