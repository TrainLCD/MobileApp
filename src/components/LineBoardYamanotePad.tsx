import React, { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import useAppState from '../hooks/useAppState'
import useCurrentLine from '../hooks/useCurrentLine'
import useGetLineMark from '../hooks/useGetLineMark'
import useIsEn from '../hooks/useIsEn'
import useNextStation from '../hooks/useNextStation'
import useStationNumberIndexFunc from '../hooks/useStationNumberIndexFunc'
import useTransferLines from '../hooks/useTransferLines'
import { Station } from '../models/StationAPI'
import lineState from '../store/atoms/line'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import prependHEX from '../utils/prependHEX'
import PadArch from './PadArch'

interface Props {
  stations: Station[]
}

const LineBoardYamanotePad: React.FC<Props> = ({ stations }: Props) => {
  const appState = useAppState()
  const { station, arrived } = useRecoilValue(stationState)
  const { selectedLine } = useRecoilValue(lineState)
  const currentLine = useCurrentLine()
  const getLineMarkFunc = useGetLineMark()
  const nextStation = useNextStation()
  const isEn = useIsEn()
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
        const numberingIndex = getStationNumberIndex(
          switchedStation.stationNumbers
        )
        return getLineMarkFunc({
          station: switchedStation,
          line: tl,
          numberingIndex,
        })
      }),
    [getLineMarkFunc, getStationNumberIndex, switchedStation, transferLines]
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
        const stationNumberIndex = getStationNumberIndex(s.stationNumbers)

        const lineMarkShape = getLineMarkFunc({
          station: s,
          line: s.currentLine,
          numberingIndex: stationNumberIndex,
        })
        return s.stationNumbers[stationNumberIndex] && lineMarkShape
          ? {
              stationNumber: s.stationNumbers[stationNumberIndex].stationNumber,
              lineColor: prependHEX(
                s.stationNumbers[stationNumberIndex]?.lineSymbolColor ??
                  s.currentLine.lineColorC
              ),
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

export default LineBoardYamanotePad
