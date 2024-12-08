import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { withAnchorPoint } from 'react-native-anchor-point'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRecoilValue } from 'recoil'
import { STATION_NAME_FONT_SIZE, parenthesisRegexp } from '../constants'
import { useBoundText } from '../hooks/useBoundText'
import useConnectedLines from '../hooks/useConnectedLines'
import { useCurrentLine } from '../hooks/useCurrentLine'
import { useCurrentStation } from '../hooks/useCurrentStation'
import useCurrentTrainType from '../hooks/useCurrentTrainType'
import useIsNextLastStop from '../hooks/useIsNextLastStop'
import useLazyPrevious from '../hooks/useLazyPrevious'
import { useNextStation } from '../hooks/useNextStation'
import { useNumbering } from '../hooks/useNumbering'
import { HeaderLangState } from '../models/HeaderTransitionState'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import tuningState from '../store/atoms/tuning'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import katakanaToHiragana from '../utils/kanaToHiragana'
import { getNumberingColor } from '../utils/numbering'
import { RFValue } from '../utils/rfValue'
import Clock from './Clock'
import NumberingIcon from './NumberingIcon'
import TrainTypeBox from './TrainTypeBoxSaikyo'
import Typography from './Typography'

const { width: windowWidth } = Dimensions.get('window')

const styles = StyleSheet.create({
  gradientRoot: {
    paddingRight: 21,
    paddingLeft: 21,
    overflow: 'hidden',
  },
  bottom: {
    height: isTablet ? 128 : 84,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingBottom: 8,
  },
  boundWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 8,
  },
  connectedLines: {
    fontWeight: 'bold',
    color: '#555',
    fontSize: RFValue(14),
  },
  boundTextContainer: {
    position: 'absolute',
  },
  boundText: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: RFValue(18),
    position: 'absolute',
  },
  stateWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginRight: 12,
    marginBottom: isTablet ? 8 : 4,
  },
  state: {
    position: 'absolute',
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#3a3a3a',
    textAlign: 'right',
  },
  stationNameWrapper: {
    width: windowWidth * 0.72,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stationNameContainer: {
    position: 'absolute',
    justifyContent: 'center',
  },
  stationName: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#3a3a3a',
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockOverride: {
    position: 'absolute',
    bottom: 0,
  },
})

type HeaderBarProps = {
  lineColor: string
  height: number
}

const headerBarStyles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: 'black',
  },
  gradient: {
    flex: 1,
  },
})

const HeaderBar: React.FC<HeaderBarProps> = ({
  lineColor,
  height,
}: HeaderBarProps) => (
  <View style={[headerBarStyles.root, { height }]}>
    <LinearGradient
      style={headerBarStyles.gradient}
      colors={[
        '#fcfcfc',
        `${lineColor}bb`,
        `${lineColor}bb`,
        `${lineColor}bb`,
        '#fcfcfc',
      ]}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={[0, 0]}
      end={[1, 1]}
    />
  </View>
)

const HeaderSaikyo: React.FC = () => {
  const currentStation = useCurrentStation()
  const currentLine = useCurrentLine()
  const nextStation = useNextStation()

  const [fadeOutFinished, setFadeOutFinished] = useState(false)
  const { selectedBound, arrived } = useRecoilValue(stationState)
  const { headerState } = useRecoilValue(navigationState)
  const { headerTransitionDelay } = useRecoilValue(tuningState)

  const connectedLines = useConnectedLines()
  const isLast = useIsNextLastStop()
  const trainType = useCurrentTrainType()
  const boundStationNameList = useBoundText()

  const connectionText = useMemo(
    () =>
      connectedLines
        ?.map((l) => l.nameShort.replace(parenthesisRegexp, ''))
        .slice(0, 2)
        .join('・'),
    [connectedLines]
  )

  const nameFadeAnim = useSharedValue<number>(1)
  const topNameScaleYAnim = useSharedValue<number>(0)
  const stateOpacityAnim = useSharedValue<number>(0)
  const boundOpacityAnim = useSharedValue<number>(0)
  const bottomNameScaleYAnim = useSharedValue<number>(1)

  const { right: safeAreaRight } = useSafeAreaInsets()
  const headerLangState = useMemo(
    () =>
      headerState.split('_')[1]?.length
        ? headerState.split('_')[1]
        : ('JA' as HeaderLangState),
    [headerState]
  )

  const boundText = useMemo(
    () => boundStationNameList[headerLangState],
    [boundStationNameList, headerLangState]
  )

  const stationText = useMemo<string>(() => {
    if (!selectedBound) {
      return currentStation?.name ?? ''
    }
    switch (headerState) {
      case 'ARRIVING':
        return nextStation?.name ?? ''
      case 'ARRIVING_KANA':
        return katakanaToHiragana(nextStation?.nameKatakana)
      case 'ARRIVING_EN': {
        if (nextStation?.nameRoman) {
          return nextStation.nameRoman
        }
        return ''
      }
      case 'ARRIVING_ZH': {
        if (nextStation?.nameChinese) {
          return nextStation.nameChinese
        }
        return ''
      }
      case 'ARRIVING_KO': {
        if (nextStation?.nameKorean) {
          return nextStation.nameKorean
        }
        return ''
      }
      case 'CURRENT':
        return currentStation?.name ?? ''
      case 'CURRENT_KANA':
        return katakanaToHiragana(currentStation?.nameKatakana)
      case 'CURRENT_EN': {
        if (currentStation?.nameRoman) {
          return currentStation.nameRoman
        }
        return ''
      }
      case 'CURRENT_ZH': {
        if (currentStation?.nameChinese) {
          return currentStation.nameChinese ?? ''
        }
        return ''
      }
      case 'CURRENT_KO': {
        if (currentStation?.nameKorean) {
          return currentStation.nameKorean ?? ''
        }
        return ''
      }
      case 'NEXT': {
        if (nextStation?.name) {
          return nextStation.name
        }
        return ''
      }
      case 'NEXT_KANA':
        if (nextStation?.nameKatakana) {
          return katakanaToHiragana(nextStation.nameKatakana)
        }
        return ''
      case 'NEXT_EN':
        if (nextStation?.nameRoman) {
          return nextStation?.nameRoman ?? ''
        }
        return ''
      case 'NEXT_ZH':
        if (nextStation?.nameChinese) {
          return nextStation.nameChinese
        }
        return ''
      case 'NEXT_KO':
        if (nextStation?.nameKorean) {
          return nextStation.nameKorean
        }
        return ''
      default:
        return ''
    }
  }, [
    currentStation?.name,
    currentStation?.nameChinese,
    currentStation?.nameKatakana,
    currentStation?.nameKorean,
    currentStation?.nameRoman,
    headerState,
    nextStation?.name,
    nextStation?.nameChinese,
    nextStation?.nameKatakana,
    nextStation?.nameKorean,
    nextStation?.nameRoman,
    selectedBound,
  ])

  const stateText = useMemo<string>(() => {
    if (!selectedBound) {
      return translate('nowStoppingAt')
    }
    switch (headerState) {
      case 'ARRIVING':
        return translate(isLast ? 'soonLast' : 'soon')
      case 'ARRIVING_KANA':
        return translate(isLast ? 'soonKanaLast' : 'soon')
      case 'ARRIVING_EN':
        return translate(isLast ? 'soonEnLast' : 'soonEn')
      case 'ARRIVING_ZH':
        return translate(isLast ? 'soonZhLast' : 'soonZh')
      case 'ARRIVING_KO':
        return translate(isLast ? 'soonKoLast' : 'soonKo')
      case 'CURRENT':
        return translate('nowStoppingAt')
      case 'CURRENT_KANA':
        return translate('nowStoppingAt')
      case 'CURRENT_EN':
      case 'CURRENT_ZH':
      case 'CURRENT_KO':
        return ''
      case 'NEXT':
        if (nextStation) {
          return translate(isLast ? 'nextLast' : 'next')
        }
        return ''
      case 'NEXT_KANA':
        if (nextStation) {
          return translate(isLast ? 'nextKanaLast' : 'nextKana')
        }
        return ''
      case 'NEXT_EN':
        if (nextStation) {
          return translate(isLast ? 'nextEnLast' : 'nextEn')
        }
        return ''
      case 'NEXT_ZH':
        if (nextStation) {
          return translate(isLast ? 'nextZhLast' : 'nextZh')
        }
        return ''
      case 'NEXT_KO':
        if (nextStation) {
          return translate(isLast ? 'nextKoLast' : 'nextKo')
        }
        return ''
      default:
        return ''
    }
  }, [headerState, isLast, nextStation, selectedBound])

  const prevStationText = useLazyPrevious(stationText, fadeOutFinished)
  const prevStateText = useLazyPrevious(stateText, fadeOutFinished)
  const prevHeaderState = useLazyPrevious(headerState, fadeOutFinished)
  const prevBoundText = useLazyPrevious(boundText, fadeOutFinished)
  const prevConnectionText = useLazyPrevious(connectionText, fadeOutFinished)

  const isJapaneseState = useMemo(
    () => headerLangState === 'JA' || headerLangState === 'KANA',
    [headerLangState]
  )

  const prevBoundIsDifferent = useMemo(
    () => prevBoundText !== boundText,
    [boundText, prevBoundText]
  )

  const fadeIn = useCallback(() => {
    if (!selectedBound) {
      if (prevHeaderState === headerState) {
        topNameScaleYAnim.value = 0
        nameFadeAnim.value = 1
        bottomNameScaleYAnim.value = 1
        stateOpacityAnim.value = 0
        setFadeOutFinished(true)
      }
      return
    }

    const handleFinish = (finished: boolean | undefined) => {
      if (finished) {
        setFadeOutFinished(true)
      }
    }

    if (prevHeaderState !== headerState) {
      topNameScaleYAnim.value = withTiming(0, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      })
      nameFadeAnim.value = withTiming(
        1,
        {
          duration: headerTransitionDelay,
          easing: Easing.linear,
        },
        (finished) => runOnJS(handleFinish)(finished)
      )
      bottomNameScaleYAnim.value = withTiming(1, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      })
      stateOpacityAnim.value = withTiming(0, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      })
    }
    if (prevBoundIsDifferent) {
      boundOpacityAnim.value = withTiming(0, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      })
    }
  }, [
    bottomNameScaleYAnim,
    boundOpacityAnim,
    headerState,
    headerTransitionDelay,
    nameFadeAnim,
    prevBoundIsDifferent,
    prevHeaderState,
    selectedBound,
    stateOpacityAnim,
    topNameScaleYAnim,
  ])

  const fadeOut = useCallback((): void => {
    if (!selectedBound) {
      return
    }

    nameFadeAnim.value = 0
    topNameScaleYAnim.value = 1
    stateOpacityAnim.value = 1
    boundOpacityAnim.value = 1
    bottomNameScaleYAnim.value = 0
  }, [
    selectedBound,
    nameFadeAnim,
    topNameScaleYAnim,
    stateOpacityAnim,
    boundOpacityAnim,
    bottomNameScaleYAnim,
  ])

  const prevIsJapaneseState = useLazyPrevious(isJapaneseState, fadeOutFinished)

  const fade = useCallback(() => {
    fadeOut()
    fadeIn()
  }, [fadeIn, fadeOut])

  useEffect(() => {
    setFadeOutFinished(false)

    if (headerState === prevHeaderState && !!selectedBound) {
      return
    }

    if (!selectedBound) {
      setFadeOutFinished(true)
    }
    fade()
  }, [
    currentStation?.nameChinese,
    currentStation?.nameKorean,
    fade,
    headerState,
    nextStation,
    prevHeaderState,
    selectedBound,
  ])

  const stateTopAnimatedStyles = useAnimatedStyle(() => ({
    opacity: 1 - stateOpacityAnim.get(),
  }))

  const stateBottomAnimatedStyles = useAnimatedStyle(() => ({
    opacity: stateOpacityAnim.get(),
  }))

  const topNameAnimatedAnchorStyle = useAnimatedStyle(() => {
    const transform = {
      transform: [
        {
          scaleY: interpolate(topNameScaleYAnim.get(), [0, 1], [1, 0]),
        },
      ],
    }

    return withAnchorPoint(
      transform,
      { x: 0, y: 0 },
      {
        width: windowWidth,
        height: STATION_NAME_FONT_SIZE,
      }
    )
  })

  const bottomNameAnimatedAnchorStyle = useAnimatedStyle(() => {
    const transform = {
      transform: [
        {
          scaleY: topNameScaleYAnim.get(),
        },
      ],
    }
    return withAnchorPoint(
      transform,
      { x: 0, y: 1 },
      {
        width: windowWidth,
        height: STATION_NAME_FONT_SIZE,
      }
    )
  })

  const topNameAnimatedStyles = useAnimatedStyle(() => {
    return {
      opacity: nameFadeAnim.get(),
    }
  })

  const bottomNameAnimatedStyles = useAnimatedStyle(() => {
    return {
      opacity: interpolate(nameFadeAnim.get(), [0, 1], [1, 0]),
    }
  })

  const boundTopAnimatedStyles = useAnimatedStyle(() => ({
    opacity: 1 - boundOpacityAnim.get(),
  }))

  const boundBottomAnimatedStyles = useAnimatedStyle(() => ({
    opacity: boundOpacityAnim.get(),
  }))

  const [currentStationNumber, threeLetterCode] = useNumbering()
  const lineColor = useMemo(() => currentLine?.color, [currentLine])
  const numberingColor = useMemo(
    () =>
      getNumberingColor(
        arrived,
        currentStationNumber,
        nextStation,
        currentLine
      ),
    [arrived, currentStationNumber, currentLine, nextStation]
  )

  return (
    <View>
      <HeaderBar height={15} lineColor={lineColor || '#00ac9a'} />
      <View style={{ backgroundColor: 'white', height: 2, opacity: 0.5 }} />
      <LinearGradient
        colors={['#aaa', '#fcfcfc']}
        locations={[0, 0.2]}
        style={styles.gradientRoot}
      >
        <View style={styles.headerTexts}>
          <TrainTypeBox
            lineColor={lineColor || '#00ac9a'}
            trainType={trainType}
          />
          <View style={styles.boundWrapper}>
            <Animated.Text
              style={[boundTopAnimatedStyles, styles.boundTextContainer]}
            >
              <Typography style={styles.connectedLines}>
                {connectedLines?.length && isJapaneseState
                  ? `${connectionText}直通 `
                  : null}
              </Typography>
              <Typography style={styles.boundText}>{boundText}</Typography>
            </Animated.Text>

            <Animated.Text
              style={[boundBottomAnimatedStyles, styles.boundTextContainer]}
            >
              <Typography style={styles.connectedLines}>
                {connectedLines?.length && prevIsJapaneseState
                  ? `${prevConnectionText}直通 `
                  : null}
              </Typography>
              <Typography style={styles.boundText}>{prevBoundText}</Typography>
            </Animated.Text>
          </View>
        </View>
        <View style={styles.bottom}>
          <View style={styles.stateWrapper}>
            <Animated.Text
              adjustsFontSizeToFit
              numberOfLines={stateText.includes('\n') ? 2 : 1}
              style={[
                stateTopAnimatedStyles,
                styles.state,
                {
                  height: stateText.includes('\n')
                    ? STATION_NAME_FONT_SIZE
                    : undefined,
                },
              ]}
            >
              {stateText}
            </Animated.Text>
            <Animated.Text
              adjustsFontSizeToFit
              numberOfLines={prevStateText.includes('\n') ? 2 : 1}
              style={[
                stateBottomAnimatedStyles,
                styles.state,
                {
                  height: prevStateText.includes('\n')
                    ? STATION_NAME_FONT_SIZE
                    : undefined,
                },
              ]}
            >
              {prevStateText}
            </Animated.Text>
          </View>

          {currentStationNumber ? (
            <NumberingIcon
              shape={currentStationNumber.lineSymbolShape}
              lineColor={numberingColor}
              stationNumber={currentStationNumber.stationNumber}
              threeLetterCode={threeLetterCode}
              allowScaling
            />
          ) : null}
          <View>
            <View style={styles.stationNameWrapper}>
              <View style={styles.stationNameContainer}>
                <Animated.Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={[
                    topNameAnimatedStyles,
                    styles.stationName,
                    topNameAnimatedAnchorStyle,
                    {
                      fontSize: STATION_NAME_FONT_SIZE,
                    },
                  ]}
                >
                  {stationText}
                </Animated.Text>
              </View>

              <View style={styles.stationNameContainer}>
                <Animated.Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={[
                    bottomNameAnimatedStyles,
                    styles.stationName,
                    bottomNameAnimatedAnchorStyle,
                    {
                      opacity: interpolate(nameFadeAnim.get(), [0, 1], [1, 0]),
                      fontSize: STATION_NAME_FONT_SIZE,
                    },
                  ]}
                >
                  {prevStationText}
                </Animated.Text>
              </View>
            </View>
          </View>
        </View>
        <Clock
          bold
          style={{ ...styles.clockOverride, right: 8 + safeAreaRight }}
        />
      </LinearGradient>
      <HeaderBar height={5} lineColor={lineColor || '#00ac9a'} />
    </View>
  )
}

export default React.memo(HeaderSaikyo)
