import { useCallback } from 'react'
import { Line, LineType, Station } from '../gen/stationapi_pb'
import { getLineSymbolImage } from '../lineSymbolImage'
import { LineMark } from '../models/LineMark'

const useGetLineMark = (): (({
  station,
  line,
  shouldGrayscale,
}: {
  station?: Station.AsObject
  numberingIndex?: number
  line: Line.AsObject | undefined
  shouldGrayscale?: boolean
}) => LineMark | null) => {
  const func = useCallback(
    ({
      station,
      numberingIndex = 0,
      line,
      shouldGrayscale = false,
    }: {
      station?: Station.AsObject
      numberingIndex?: number
      line: Line.AsObject | undefined
      shouldGrayscale?: boolean
    }): LineMark | null => {
      if (
        !line?.lineSymbolsList?.length &&
        line?.lineType !== LineType.BULLETTRAIN
      ) {
        return null
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
      ]

      const lineMarkIndex = [
        lineMarkMap?.sign,
        lineMarkMap?.subSign,
        lineMarkMap?.extraSign,
      ].findIndex((sign) =>
        station
          ? station?.stationNumbersList?.[numberingIndex]?.lineSymbol === sign
          : line.station?.stationNumbersList[numberingIndex]?.lineSymbol ===
            sign
      )

      return lineMarkList[lineMarkIndex]
    },
    []
  )

  return func
}

export default useGetLineMark
