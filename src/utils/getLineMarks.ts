import { OMIT_JR_THRESHOLD } from '../constants'
import { MARK_SHAPE } from '../constants/numbering'
import { LineResponse, StationResponse } from '../gen/stationapi_pb'
import { getLineSymbolImage } from '../lineSymbolImage'
import { LineMark } from '../models/LineMark'
import { LINE_TYPE } from '../models/StationAPI'
import { isJRLine } from './jr'

const mockJR = {
  signShape: MARK_SHAPE.REVERSED_SQUARE,
  sign: 'JR',
}

/**
 * 直接使わず、useLineMarksを使う
 */
const getLineMarks = ({
  station,
  transferLines,
  omittedTransferLines,
  numberingIndex,
  grayscale,
}: {
  station: StationResponse.AsObject
  transferLines: LineResponse.AsObject[]
  omittedTransferLines: LineResponse.AsObject[]
  numberingIndex: number
  grayscale?: boolean
}): (LineMark | null)[] => {
  const notJRLines = transferLines.filter((l) => !isJRLine(l))
  const jrLines = transferLines
    .filter((l: LineResponse.AsObject) => isJRLine(l))
    .filter((l: LineResponse.AsObject) => l.lineType !== LINE_TYPE.BULLET_TRAIN)
  const bulletTrains = transferLines.filter(
    (l) => l.lineType === LINE_TYPE.BULLET_TRAIN
  )
  const jrLineUnionMark = jrLines.reduce<LineMark>(
    (acc, cur) => {
      const lineMark = getLineSymbolImage(cur, !!grayscale)
      return {
        ...acc,
        jrUnionSigns: station.stationNumbersList[numberingIndex]
          ?.lineSymbolShape
          ? Array.from(
              new Set([
                ...(acc.jrUnionSigns || []),
                station.stationNumbersList[numberingIndex]?.lineSymbolShape,
              ])
            )
          : acc.jrUnionSigns,
        jrUnionSignPaths: lineMark?.signPath
          ? Array.from(
              new Set([...(acc.jrUnionSignPaths || []), lineMark.signPath])
            )
          : acc.jrUnionSignPaths,
      }
    },
    {
      signShape: MARK_SHAPE.JR_UNION,
      jrUnionSigns: [],
      jrUnionSignPaths: [],
    }
  )

  const bulletTrainUnionMarkOrigin = bulletTrains.reduce<LineMark>(
    (acc, cur) => {
      const lineMark = getLineSymbolImage(cur, !!grayscale)
      return {
        ...acc,
        btUnionSigns: station.stationNumbersList[numberingIndex]
          ?.lineSymbolShape
          ? Array.from(
              new Set([
                ...(acc.btUnionSigns || []),
                station.stationNumbersList[numberingIndex]?.lineSymbolShape,
              ])
            )
          : acc.btUnionSigns,
        btUnionSignPaths: lineMark?.signPath
          ? Array.from(
              new Set([...(acc.btUnionSignPaths || []), lineMark.signPath])
            )
          : acc.btUnionSignPaths,
      }
    },
    {
      signShape: MARK_SHAPE.BULLET_TRAIN_UNION,
      btUnionSigns: [],
      btUnionSignPaths: [],
    }
  )
  const bulletTrainUnionMark =
    (bulletTrainUnionMarkOrigin.btUnionSignPaths || []).length > 0
      ? bulletTrainUnionMarkOrigin
      : null
  const withoutJRLineMarks = notJRLines.map((l) =>
    getLineSymbolImage(l, !!grayscale)
  )
  const isJROmitted = jrLines.length >= OMIT_JR_THRESHOLD

  const jrLineUnionMarkWithMock =
    (jrLineUnionMark?.jrUnionSignPaths?.length || 0) === 0
      ? mockJR
      : jrLineUnionMark

  return (
    isJROmitted
      ? [
          ...[bulletTrainUnionMark, jrLineUnionMarkWithMock].filter((m) => !!m),
          ...withoutJRLineMarks,
        ]
      : omittedTransferLines.map<LineMark | null>((l) =>
          l.lineSymbolsList.length || l.lineType === LINE_TYPE.BULLET_TRAIN
            ? {
                ...getLineSymbolImage(l, !!grayscale),
                signShape: l.lineSymbolsList[0]?.shape,
                sign: l.lineSymbolsList[0]?.symbol,
              }
            : null
        )
  ).filter(
    (lm: LineMark | null) =>
      lm?.btUnionSignPaths?.length !== 0 || lm?.btUnionSigns?.length !== 0
  )
}

export default getLineMarks
