import { useCallback } from 'react'
import { LineResponse, StationResponse } from '../gen/stationapi_pb'
import { getLineSymbolImage } from '../lineSymbolImage'
import { LineMark } from '../models/LineMark'
import { LINE_TYPE } from '../models/StationAPI'

type LineMarkWithCurrentLineMark = LineMark & {
  currentLineMark: LineMark | null
}

const useGetLineMark = (): (({
  station,
  line,
}: {
  numberingIndex?: number
  station?: StationResponse.AsObject | undefined
  line: LineResponse.AsObject | undefined
}) => LineMarkWithCurrentLineMark | null) => {
  const func = useCallback(
    ({
      numberingIndex = 0,
      station,
      line,
    }: {
      numberingIndex?: number
      station?: StationResponse.AsObject
      line: LineResponse.AsObject | undefined
    }): LineMarkWithCurrentLineMark | null => {
      if (
        !line?.lineSymbolsList?.length &&
        line?.lineType !== LINE_TYPE.BULLET_TRAIN
      ) {
        return null
      }

      const lineMarkMap = {
        sign: line.lineSymbolsList[0]?.symbol,
        signShape: line.lineSymbolsList[0]?.shape,
        signPath: getLineSymbolImage(line, false)?.signPath,
        subSign: line.lineSymbolsList[1]?.symbol,
        subSignShape: line.lineSymbolsList[1]?.shape,
        subSignPath: getLineSymbolImage(line, false)?.subSignPath,
        extraSign: line.lineSymbolsList[2]?.symbol,
        extraSignShape: line.lineSymbolsList[2]?.shape,
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
          ? station?.stationNumbersList?.[numberingIndex]?.lineSymbol === sign
          : line.station?.stationNumbersList[numberingIndex]?.lineSymbol ===
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
