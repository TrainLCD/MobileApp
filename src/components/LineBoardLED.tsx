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
import useCurrentStation from '../hooks/useCurrentStation'
import useCurrentTrainType from '../hooks/useCurrentTrainType'
import { useNextStation } from '../hooks/useNextStation'
import useUpcomingStations from '../hooks/useNextStation/useUpcomingStations'
import { useNumbering } from '../hooks/useNumbering'
import useTransferLines from '../hooks/useTransferLines'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import {
  getIsLoopLine,
  getIsMeijoLine,
  getIsOsakaLoopLine,
  getIsYamanoteLine,
} from '../utils/loopLine'
import { getTrainTypeString } from '../utils/trainTypeString'

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flex: 1,
    gap: 16,
  },
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
  const currentStation = useCurrentStation()
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

  if (approaching && !arrived && !getIsPass(nextStation ?? null)) {
    return (
      <AutoScroll duration={10000} delay={0}>
        <View style={styles.container}>
          <GreenText>まもなく</GreenText>
          <OrangeText>{nextStation?.name}</OrangeText>
          <GreenText>です。</GreenText>
          {afterNextStation ? (
            <>
              <OrangeText>{nextStation?.name}</OrangeText>
              <GreenText>の次は</GreenText>
              <OrangeText>{afterNextStation?.name}</OrangeText>
              <GreenText>に停車いたします。</GreenText>
              {nextStation?.stopCondition !== StopCondition.ALL && (
                <>
                  <CrimsonText>
                    {nextStation?.name}
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
          <Text>
            <OrangeText>
              {nextStation?.nameRoman}
              {nextStationNumber ? `(${nextStationNumber.stationNumber})` : ''}
            </OrangeText>
            <GreenText>.</GreenText>
          </Text>

          {afterNextStation ? (
            <>
              <Text>
                <GreenText>The stop after</GreenText>
                <OrangeText>
                  {nextStation?.nameRoman}
                  {nextStationNumber
                    ? `(${nextStationNumber.stationNumber})`
                    : ''}
                </OrangeText>
                <GreenText>,</GreenText>
              </Text>

              <GreenText>will be </GreenText>

              <Text>
                <OrangeText>
                  {afterNextStation?.nameRoman}
                  {afterNextStation?.stationNumbersList[0]
                    ? `(${afterNextStation?.stationNumbersList[0]?.stationNumber})`
                    : ''}
                </OrangeText>
                <GreenText>.</GreenText>
              </Text>
            </>
          ) : null}
          {transferLines.length > 0 ? (
            <>
              <GreenText>Please change here for</GreenText>

              <Text>
                <OrangeText>
                  {transferLines
                    .map((l) => l.nameRoman)
                    .map((name, idx, arr) =>
                      idx === arr.length - 1 && arr.length > 1
                        ? `and the ${name}`
                        : `the ${name}`
                    )
                    .join('')}
                </OrangeText>
                <GreenText>.</GreenText>
              </Text>
            </>
          ) : null}
        </View>
      </AutoScroll>
    )
  }

  if (arrived && currentStation && !getIsPass(currentStation)) {
    return (
      <AutoScroll duration={10000} delay={0}>
        <View style={styles.container}>
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
          <Text>
            <OrangeText>{boundTexts[1]}</OrangeText>
            <GreenText>.</GreenText>
          </Text>
        </View>
      </AutoScroll>
    )
  }

  return (
    <AutoScroll duration={10000} delay={0}>
      <View style={styles.container}>
        <GreenText>次は</GreenText>
        <OrangeText>{nextStation?.name}</OrangeText>
        <GreenText>です。</GreenText>
        {afterNextStation ? (
          <>
            <OrangeText>{nextStation?.name}</OrangeText>
            <GreenText>の次は</GreenText>
            <OrangeText>{afterNextStation?.name}</OrangeText>
            <GreenText>に停車いたします。</GreenText>
            {nextStation?.stopCondition !== StopCondition.ALL && (
              <>
                <CrimsonText>
                  {nextStation?.name}
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
        <Text>
          <OrangeText>
            {nextStation?.nameRoman}
            {nextStationNumber ? `(${nextStationNumber.stationNumber})` : ''}
          </OrangeText>
          <GreenText>.</GreenText>
        </Text>
        {afterNextStation ? (
          <>
            <GreenText>The stop after</GreenText>
            <Text>
              <OrangeText>
                {nextStation?.nameRoman}
                {nextStationNumber
                  ? `(${nextStationNumber.stationNumber})`
                  : ''}
              </OrangeText>
              <GreenText>,</GreenText>
            </Text>

            <GreenText>will be</GreenText>
            <Text>
              <OrangeText>
                {afterNextStation?.nameRoman}
                {afterNextStation?.stationNumbersList[0]
                  ? `(${afterNextStation?.stationNumbersList[0]?.stationNumber})`
                  : ''}
              </OrangeText>
              <GreenText>.</GreenText>
            </Text>
          </>
        ) : null}
        {transferLines.length > 0 ? (
          <>
            <GreenText>Please change here for</GreenText>
            <Text>
              <OrangeText>
                {transferLines
                  .map((l) => l.nameRoman)
                  .map((name, idx, arr) =>
                    idx === arr.length - 1 && arr.length > 1
                      ? `and the ${name}`
                      : `the ${name}`
                  )
                  .join('')}
              </OrangeText>
              <GreenText>.</GreenText>
            </Text>
          </>
        ) : null}
      </View>
    </AutoScroll>
  )
}

export default React.memo(LineBoardLED)
