import AutoScroll from '@homielab/react-native-auto-scroll'
import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRecoilValue } from 'recoil'
import { STATION_NAME_FONT_SIZE } from '../constants'
import FONTS from '../constants/fonts'
import { parenthesisRegexp } from '../constants/regexp'
import { StopCondition } from '../gen/stationapi_pb'
import useBounds from '../hooks/useBounds'
import { useCurrentLine } from '../hooks/useCurrentLine'
import useCurrentTrainType from '../hooks/useCurrentTrainType'
import { useNextStation } from '../hooks/useNextStation'
import useUpcomingStations from '../hooks/useNextStation/useUpcomingStations'
import { useNumbering } from '../hooks/useNumbering'
import useTransferLines from '../hooks/useTransferLines'
import stationState from '../store/atoms/station'
import {
  getIsLoopLine,
  getIsMeijoLine,
  getIsOsakaLoopLine,
  getIsYamanoteLine,
} from '../utils/loopLine'
import { getTrainTypeString } from '../utils/trainTypeString'

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexRow: { flexDirection: 'row', gap: 25 },
  text: {
    fontSize: STATION_NAME_FONT_SIZE,
    fontFamily: FONTS.JFDotJiskan24h,
    color: 'white',
  },
  green: { color: 'green' },
  orange: { color: 'orange' },
  crimson: { color: 'crimson' },
})

const GreenText = ({ children }: { children: React.ReactNode }) => (
  <Text style={[styles.text, styles.green]}>{children}</Text>
)
const OrangeText = ({ children }: { children: React.ReactNode }) => (
  <Text style={[styles.text, styles.orange]}>{children}</Text>
)
const CrimsonText = ({ children }: { children: React.ReactNode }) => (
  <Text style={[styles.text, styles.crimson]}>{children}</Text>
)

const LineBoardLED = () => {
  const { selectedDirection, arrived, approaching } =
    useRecoilValue(stationState)

  const line = useCurrentLine()
  const nextStation = useNextStation()
  const trainType = useCurrentTrainType()
  const { bounds } = useBounds()
  const upcomingStations = useUpcomingStations()
  const transferLines = useTransferLines()
  const [nextStationNumber] = useNumbering()
  const afterNextStation = useMemo(
    () => upcomingStations[2],
    [upcomingStations]
  )

  const trainTypeTexts = useMemo(() => {
    if (!line) {
      return ''
    }

    if (
      (getIsYamanoteLine(line.id) || getIsOsakaLoopLine(line.id)) &&
      selectedDirection
    ) {
      if (getIsMeijoLine(line.id)) {
        return [
          selectedDirection === 'INBOUND' ? '左回り' : '右回り',
          selectedDirection === 'INBOUND' ? 'Counterclockwise' : 'Clockwise',
        ]
      }
      return [
        selectedDirection === 'INBOUND' ? '内回り' : '外回り',
        selectedDirection === 'INBOUND' ? 'Counterclockwise' : 'Clockwise',
      ]
    }

    switch (
      nextStation &&
      getTrainTypeString(line, nextStation, selectedDirection)
    ) {
      case 'rapid':
        return ['快速', 'Rapid']
      case 'ltdexp':
        return ['特急', 'Limited Express']
      default:
        return [trainType?.name ?? '', trainType?.nameRoman ?? '']
    }
  }, [line, nextStation, selectedDirection, trainType])

  const boundTexts = useMemo(() => {
    const index = selectedDirection === 'INBOUND' ? 0 : 1
    const jaText = bounds[index]
      .filter((station) => station)
      .map((station) => station.name.replace(parenthesisRegexp, ''))
      .join('・')
    const enText = bounds[index]
      .filter((station) => station)
      .map(
        (station) =>
          `${station.nameRoman.replace(parenthesisRegexp, '')}${
            station.stationNumbersList[0]?.stationNumber
              ? `(${station.stationNumbersList[0]?.stationNumber})`
              : ''
          }`
      )
      .join(' and ')
    return [`${jaText}${getIsLoopLine(line, trainType) ? '方面' : ''}`, enText]
  }, [bounds, line, selectedDirection, trainType])

  if (!nextStation) {
    return null
  }

  if (approaching && !arrived) {
    return (
      <View style={styles.container}>
        <AutoScroll duration={20000} delay={0}>
          <View style={styles.flexRow}>
            <GreenText>まもなく</GreenText>
            <OrangeText>{nextStation.name}</OrangeText>
            <GreenText>です。</GreenText>
            {afterNextStation ? (
              <>
                <OrangeText>{nextStation.name}</OrangeText>
                <GreenText>の次は</GreenText>
                <OrangeText>{afterNextStation.name}</OrangeText>
                <GreenText>に停車いたします。</GreenText>
                {nextStation.stopCondition !== StopCondition.ALL && (
                  <>
                    <CrimsonText>
                      {nextStation.name}
                      は一部列車は通過いたします。
                    </CrimsonText>
                    <OrangeText>ご注意ください。</OrangeText>
                  </>
                )}
              </>
            ) : null}

            {transferLines.length > 0 ? (
              <>
                <OrangeText>
                  {transferLines.map((l) => l.nameShort).join('、')}
                </OrangeText>
                <GreenText>はお乗り換えです。</GreenText>
              </>
            ) : null}
            <GreenText>The next stop is</GreenText>
            <OrangeText>
              {nextStation.nameRoman}
              {nextStationNumber ? `(${nextStationNumber.stationNumber})` : ''}
            </OrangeText>
            {afterNextStation ? (
              <>
                <GreenText>. The stop after </GreenText>
                <OrangeText>
                  {nextStation.nameRoman}
                  {nextStationNumber
                    ? `(${nextStationNumber.stationNumber})`
                    : ''}
                </OrangeText>
                <GreenText>, will be </GreenText>

                <OrangeText>
                  {afterNextStation.nameRoman}
                  {afterNextStation
                    ? `(${afterNextStation.stationNumbersList[0]?.stationNumber})`
                    : ''}
                </OrangeText>
              </>
            ) : null}
            <GreenText>.</GreenText>
            {transferLines.length > 0 ? (
              <>
                <GreenText>Please change here for</GreenText>
                <GreenText>.</GreenText>
              </>
            ) : null}
          </View>
        </AutoScroll>
      </View>
    )
  }

  if (!approaching && !arrived) {
    return (
      <View style={styles.container}>
        <AutoScroll duration={20000} delay={0}>
          <View style={styles.flexRow}>
            <GreenText>次は</GreenText>
            <OrangeText>{nextStation.name}</OrangeText>
            <GreenText>です。</GreenText>

            {afterNextStation ? (
              <>
                <OrangeText>{nextStation.name}</OrangeText>
                <GreenText>の次は</GreenText>
                <OrangeText>{afterNextStation.name}</OrangeText>
                <GreenText>に停車いたします。</GreenText>
                {nextStation.stopCondition !== StopCondition.ALL && (
                  <>
                    <CrimsonText>
                      {nextStation.name}
                      は一部列車は通過いたします。
                    </CrimsonText>
                    <OrangeText>ご注意ください。</OrangeText>
                  </>
                )}
              </>
            ) : null}
            {transferLines.length > 0 ? (
              <>
                <OrangeText>
                  {transferLines.map((l) => l.nameShort).join('、')}
                </OrangeText>
                <GreenText>はお乗り換えです。</GreenText>
              </>
            ) : null}
            <GreenText>The next stop is</GreenText>
            <OrangeText>
              {nextStation.nameRoman}
              {nextStationNumber ? `(${nextStationNumber.stationNumber})` : ''}
            </OrangeText>
            {afterNextStation ? (
              <>
                <GreenText>. The stop after </GreenText>
                <OrangeText>
                  {nextStation.nameRoman}
                  {nextStationNumber
                    ? `(${nextStationNumber.stationNumber})`
                    : ''}
                </OrangeText>
                <GreenText>, will be </GreenText>
                <OrangeText>
                  {afterNextStation.nameRoman}
                  {afterNextStation.stationNumbersList.length
                    ? `(${afterNextStation.stationNumbersList[0]?.stationNumber})`
                    : ''}
                </OrangeText>
              </>
            ) : null}
            {transferLines.length > 0 ? (
              <>
                <GreenText>Please change here for</GreenText>
                <GreenText>.</GreenText>
              </>
            ) : null}
          </View>
        </AutoScroll>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AutoScroll duration={20000} delay={0}>
        <View style={styles.flexRow}>
          <GreenText>
            この電車は、{line?.nameShort.replace(parenthesisRegexp, '')}
          </GreenText>
          <OrangeText>
            {trainTypeTexts[0]} {boundTexts[0]}行き
          </OrangeText>
          <GreenText>です。</GreenText>
          <GreenText>
            This is the {line?.nameRoman.replace(parenthesisRegexp, '')}
          </GreenText>
          <OrangeText>{trainTypeTexts[1]}</OrangeText>
          <GreenText>train for</GreenText>
          <OrangeText>{boundTexts[1]}</OrangeText>
          <GreenText>.</GreenText>
        </View>
      </AutoScroll>
    </View>
  )
}

export default LineBoardLED
