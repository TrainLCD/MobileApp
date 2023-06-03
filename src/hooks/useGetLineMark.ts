import { useCallback } from 'react'
import { getLineSymbolImage } from '../lineSymbolImage'
import { LineMark } from '../models/LineMark'
import { Line, LINE_TYPE, Station } from '../models/StationAPI'

type LineMarkWithCurrentLineMark = LineMark & {
  currentLineMark: LineMark | null
}

const useGetLineMark = (): (({
  station,
  line,
}: {
  numberingIndex?: number
  station?: Station | undefined
  line: Line
}) => LineMarkWithCurrentLineMark | null) => {
  const func = useCallback(
    ({
      numberingIndex = 0,
      station,
      line,
    }: {
      numberingIndex?: number
      station?: Station
      line: Line
    }): LineMarkWithCurrentLineMark | null => {
      if (
        !line?.lineSymbols?.length &&
        line?.lineType !== LINE_TYPE.BULLET_TRAIN
      ) {
        return null
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
          ? station?.stationNumbers[numberingIndex]?.lineSymbol === sign
          : line.transferStation?.stationNumbers[numberingIndex]?.lineSymbol ===
            sign
      )
      const currentLineMark = lineMarkList[lineMarkIndex]

      return { ...lineMarkMap, currentLineMark }
    },
    []
  )

  return func
}

export default useGetLineMark
