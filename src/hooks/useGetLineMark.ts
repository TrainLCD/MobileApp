import { useCallback } from 'react'
import { MARK_SHAPE } from '../constants/numbering'
import { Line, LineType } from '../gen/stationapi_pb'
import { getLineSymbolImage } from '../lineSymbolImage'
import { LineMark } from '../models/LineMark'
import useStationNumberIndexFunc from './useStationNumberIndexFunc'

const useGetLineMark = () => {
  const getNumberingIndex = useStationNumberIndexFunc()

  const func = useCallback(
    ({
      line,
      shouldGrayscale = false,
    }: {
      line: Line.AsObject | undefined
      shouldGrayscale?: boolean
    }): LineMark | null => {
      if (
        !line?.lineSymbolsList?.length &&
        line?.lineType !== LineType.BULLETTRAIN
      ) {
        return null
      }

      const firstLineSymbol = line.lineSymbolsList[0]
      const isJRLinesOmitted =
        firstLineSymbol?.shape == MARK_SHAPE.JR_UNION ||
        firstLineSymbol?.shape === MARK_SHAPE.BULLET_TRAIN_UNION
      if (isJRLinesOmitted) {
        return {
          sign: firstLineSymbol.symbol,
          signShape: firstLineSymbol.shape,
          signPath: getLineSymbolImage(line, shouldGrayscale)?.signPath,
        }
      }

      const lineMarkMap = {
        sign: line.lineSymbolsList[0]?.symbol,
        signShape: line.lineSymbolsList[0]?.shape,
        signPath: getLineSymbolImage(line, shouldGrayscale)?.signPath,
        subSign: line.lineSymbolsList[1]?.symbol,
        subSignShape: line.lineSymbolsList[1]?.shape,
        subSignPath: getLineSymbolImage(line, shouldGrayscale)?.subSignPath,
        extraSign: line.lineSymbolsList[2]?.symbol,
        extraSignShape: line.lineSymbolsList[2]?.shape,
        extraSignPath: getLineSymbolImage(line, shouldGrayscale)?.extraSignPath,
      }

      const numberingIndex = getNumberingIndex(line.station, line) ?? 0

      if (numberingIndex === -1) {
        return lineMarkMap
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
      ][numberingIndex]

      return lineMark
    },
    [getNumberingIndex]
  )

  return func
}

export default useGetLineMark
