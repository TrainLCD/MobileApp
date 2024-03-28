import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRecoilValue } from 'recoil'
import { StopCondition } from '../../gen/proto/stationapi_pb'
import { FONTS, STATION_NAME_FONT_SIZE, parenthesisRegexp } from '../constants'
import { useAfterNextStation } from '../hooks/useAfterNextStation'
import useBounds from '../hooks/useBounds'
import useCurrentTrainType from '../hooks/useCurrentTrainType'
import { useLoopLine } from '../hooks/useLoopLine'
import { useNextStation } from '../hooks/useNextStation'
import { useNumbering } from '../hooks/useNumbering'
import useTransferLines from '../hooks/useTransferLines'
import { HeaderStoppingState } from '../models/HeaderTransitionState'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { currentLineSelector } from '../store/selectors/currentLine'
import Marquee from './Marquee'

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
  const { selectedDirection } = useRecoilValue(stationState)
  const { headerState } = useRecoilValue(navigationState)
  const line = useRecoilValue(currentLineSelector)

  const stoppingState = useMemo(
    () => headerState.split('_')[0] as HeaderStoppingState,
    [headerState]
  )

  const nextStation = useNextStation()
  const trainType = useCurrentTrainType()
  const { bounds } = useBounds()
  const transferLines = useTransferLines()
  const [nextStationNumber] = useNumbering()
  const afterNextStation = useAfterNextStation()
  const { isLoopLine, isMeijoLine, isOsakaLoopLine, isYamanoteLine } =
    useLoopLine()

  const trainTypeTexts = useMemo(() => {
    if (!line) {
      return ''
    }

    if (isMeijoLine) {
      return [
        selectedDirection === 'INBOUND' ? '左回り' : '右回り',
        selectedDirection === 'INBOUND' ? 'Counterclockwise' : 'Clockwise',
      ]
    }

    if ((isYamanoteLine || isOsakaLoopLine) && selectedDirection) {
      return [
        selectedDirection === 'INBOUND' ? '内回り' : '外回り',
        selectedDirection === 'INBOUND' ? 'Counterclockwise' : 'Clockwise',
      ]
    }

    return [
      trainType?.name?.replace(parenthesisRegexp, '') ?? '',
      trainType?.nameRoman?.replace(parenthesisRegexp, '') ?? '',
    ]
  }, [
    isMeijoLine,
    isOsakaLoopLine,
    isYamanoteLine,
    line,
    selectedDirection,
    trainType?.name,
    trainType?.nameRoman,
  ])

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
          `${station?.nameRoman?.replace(parenthesisRegexp, '')}${
            station.stationNumbersList?.[0]?.stationNumber
              ? `(${station.stationNumbersList?.[0]?.stationNumber})`
              : ''
          }`
      )
      .join(' and ')
    return [`${jaText}${isLoopLine ? '方面' : ''}`, enText]
  }, [bounds, isLoopLine, selectedDirection])

  if (stoppingState === 'ARRIVING') {
    return (
      <Marquee>
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
              {nextStation?.stopCondition !== StopCondition.All && (
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
                  {afterNextStation?.stationNumbersList?.[0]
                    ? `(${afterNextStation?.stationNumbersList?.[0]?.stationNumber})`
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
                    .map((name, idx, arr) => {
                      if (!idx) {
                        return name
                      }
                      return idx === arr.length - 1 && arr.length > 1
                        ? ` and ${name}`
                        : `, ${name}`
                    })
                    .join('')}
                </OrangeText>
                <GreenText>.</GreenText>
              </Text>
            </>
          ) : null}
        </View>
      </Marquee>
    )
  }

  if (stoppingState === 'CURRENT') {
    return (
      <Marquee>
        <View style={styles.container}>
          <GreenText>
            この電車は、{line?.nameShort.replace(parenthesisRegexp, '')}
          </GreenText>
          <OrangeText>
            {trainTypeTexts[0]} {boundTexts[0]}行き
          </OrangeText>
          <GreenText>です。</GreenText>
          <GreenText>
            This is the {line?.nameRoman?.replace(parenthesisRegexp, '')}
          </GreenText>
          <OrangeText>{trainTypeTexts[1]}</OrangeText>
          <GreenText>train for</GreenText>
          <Text>
            <OrangeText>{boundTexts[1]}</OrangeText>
            <GreenText>.</GreenText>
          </Text>
        </View>
      </Marquee>
    )
  }

  return (
    <Marquee>
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
            {nextStation?.stopCondition !== StopCondition.All && (
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
                {afterNextStation?.stationNumbersList?.[0]
                  ? `(${afterNextStation?.stationNumbersList?.[0]?.stationNumber})`
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
                  .map((name, idx, arr) => {
                    if (!idx) {
                      return name
                    }
                    return idx === arr.length - 1 && arr.length > 1
                      ? ` and ${name}`
                      : `, ${name}`
                  })
                  .join('')}
              </OrangeText>
              <GreenText>.</GreenText>
            </Text>
          </>
        ) : null}
      </View>
    </Marquee>
  )
}

export default React.memo(LineBoardLED)
