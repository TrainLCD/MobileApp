import React, { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import useAppState from '../hooks/useAppState'
import useGetLineMark from '../hooks/useGetLineMark'
import { useNextStation } from '../hooks/useNextStation'
import useStationNumberIndexFunc from '../hooks/useStationNumberIndexFunc'
import useTransferLines from '../hooks/useTransferLines'
import lineState from '../store/atoms/line'
import stationState from '../store/atoms/station'
import { currentLineSelector } from '../store/selectors/currentLine'
import { isEnSelector } from '../store/selectors/isEn'
import getIsPass from '../utils/isPass'
import PadArch from './PadArch'

interface Props {
  stations: Station.AsObject[]
}

const LineBoardYamanotePad: React.FC<Props> = ({ stations }: Props) => {
  const appState = useAppState()
  const { station, arrived } = useRecoilValue(stationState)
  const { selectedLine } = useRecoilValue(lineState)
  const isEn = useRecoilValue(isEnSelector)

  const currentLine = useRecoilValue(currentLineSelector)
  const getLineMarkFunc = useGetLineMark()
  const nextStation = useNextStation()
  const transferLines = useTransferLines()
  const switchedStation = useMemo(
    () =>
      arrived && station && !getIsPass(station) ? station : nextStation ?? null,
    [arrived, nextStation, station]
  )
  const getStationNumberIndex = useStationNumberIndexFunc()

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  )

  const lineMarks = useMemo(
    () =>
      transferLines.map((tl) => {
        if (!switchedStation) {
          return null
        }

        return getLineMarkFunc({
          line: tl,
        })
      }),
    [getLineMarkFunc, switchedStation, transferLines]
  )

  const slicedStations = useMemo(
    () =>
      stations
        .slice()
        .reverse()
        .slice(0, arrived ? stations.length : stations.length - 1),
    [arrived, stations]
  )

  const archStations = useMemo(
    () =>
      new Array(6)
        .fill(null)
        .map((_, i) => slicedStations[slicedStations.length - i])
        .reverse(),
    [slicedStations]
  )

  const numberingInfo = useMemo(
    () =>
      archStations.map((s) => {
        if (!s) {
          return null
        }
        const stationNumberIndex = getStationNumberIndex(s)

        const lineMarkShape = getLineMarkFunc({
          line: s.line,
        })
        return s.stationNumbersList[stationNumberIndex] && lineMarkShape
          ? {
              stationNumber:
                s.stationNumbersList[stationNumberIndex].stationNumber,
              lineColor:
                s.stationNumbersList[stationNumberIndex]?.lineSymbolColor ??
                s.line?.color,
              lineMarkShape,
            }
          : null
      }),
    [archStations, getStationNumberIndex, getLineMarkFunc]
  )

  if (!line) {
    return null
  }

  return (
    <PadArch
      stations={archStations}
      line={line}
      arrived={arrived}
      appState={appState}
      transferLines={transferLines}
      station={switchedStation}
      numberingInfo={numberingInfo}
      lineMarks={lineMarks}
      isEn={isEn}
    />
  )
}

export default React.memo(LineBoardYamanotePad)
