import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useMemo } from 'react'
import { Dimensions, Platform, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useRecoilValue } from 'recoil'
import {
  DEFAULT_HEADER_TRANSITION_DELAY,
  parenthesisRegexp,
} from '../constants'
import { TrainType } from '../gen/stationapi_pb'
import { useCurrentLine } from '../hooks/useCurrentLine'
import useNextLine from '../hooks/useNextLine'
import useNextTrainType from '../hooks/useNextTrainType'
import { usePrevious } from '../hooks/usePrevious'
import { HeaderLangState } from '../models/HeaderTransitionState'
import { APP_THEME } from '../models/Theme'
import navigationState from '../store/atoms/navigation'
import themeState from '../store/atoms/theme'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import { getIsLocal, getIsRapid } from '../utils/trainTypeString'
import truncateTrainType from '../utils/truncateTrainType'
import Typography from './Typography'

type Props = {
  trainType: TrainType.AsObject | null
  isTY?: boolean
}

const styles = StyleSheet.create({
  box: {
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    position: 'absolute',
    borderRadius: 4,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    shadowOpacity: 0.25,
    shadowColor: '#000',
    shadowRadius: 1,
    elevation: 5,
    fontSize: isTablet ? 18 * 1.5 : 18,
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
  },
  nextTrainType: {
    fontWeight: 'bold',
    fontSize: isTablet ? 18 : 12,
    marginTop: 4,
    position: 'absolute',
    top: isTablet ? 55 : 30.25,
    width: Dimensions.get('window').width,
  },
})

const TrainTypeBox: React.FC<Props> = ({ trainType, isTY }: Props) => {
  const { headerState } = useRecoilValue(navigationState)
  const { theme } = useRecoilValue(themeState)

  const textOpacityAnim = useSharedValue(0)

  const currentLine = useCurrentLine()
  const nextTrainType = useNextTrainType()
  const nextLine = useNextLine()

  const trainTypeColor = useMemo(() => {
    if (getIsLocal(trainType)) {
      return '#1f63c6'
    }
    if (getIsRapid(trainType)) {
      return '#dc143c'
    }

    return trainType?.color ?? '#1f63c6'
  }, [trainType])
  const headerLangState = useMemo((): HeaderLangState => {
    return headerState.split('_')[1] as HeaderLangState
  }, [headerState])

  const localTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return isTY ? translate('tyLocalEn') : translate('localEn')
      case 'ZH':
        return isTY ? translate('tyLocalZh') : translate('localZh')
      case 'KO':
        return isTY ? translate('tyLocalKo') : translate('localKo')
      default:
        return isTY ? translate('tyLocal') : translate('local')
    }
  }, [headerLangState, isTY])

  const trainTypeNameJa = (trainType?.name || localTypeText)?.replace(
    parenthesisRegexp,
    ''
  )
  const trainTypeNameR = truncateTrainType(
    trainType?.nameRoman ||
      (isTY ? translate('tyLocalEn') : translate('localEn'))
  )
  const trainTypeNameZh = truncateTrainType(
    trainType?.nameChinese ||
      (isTY ? translate('tyLocalZh') : translate('localZh'))
  )
  const trainTypeNameKo = truncateTrainType(
    trainType?.nameKorean ||
      (isTY ? translate('tyLocalKo') : translate('localKo'))
  )

  const trainTypeName = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return trainTypeNameR
      case 'ZH':
        return trainTypeNameZh
      case 'KO':
        return trainTypeNameKo
      default:
        return trainTypeNameJa
    }
  }, [
    headerLangState,
    trainTypeNameJa,
    trainTypeNameKo,
    trainTypeNameR,
    trainTypeNameZh,
  ])

  const letterSpacing = useMemo(() => {
    if (trainTypeName?.length === 2) {
      return 8
    }
    return 0
  }, [trainTypeName?.length])

  const paddingLeft = useMemo(() => {
    if (trainTypeName?.length === 2 && Platform.OS === 'ios') {
      return 8
    }
    return 0
  }, [trainTypeName?.length])

  const prevPaddingLeft = usePrevious(paddingLeft)
  const prevTrainTypeText = usePrevious(trainTypeName)
  const prevLetterSpacing = usePrevious(letterSpacing)

  const resetValue = useCallback(() => {
    'worklet'
    textOpacityAnim.value = 1
  }, [textOpacityAnim])
  const updateOpacity = useCallback(() => {
    'worklet'
    textOpacityAnim.value = withTiming(0, {
      duration: DEFAULT_HEADER_TRANSITION_DELAY,
      easing: Easing.ease,
    })
  }, [textOpacityAnim])

  useEffect(() => {
    if (trainTypeName !== prevTrainTypeText) {
      runOnJS(resetValue)()
      runOnJS(updateOpacity)()
    }
  }, [
    prevTrainTypeText,
    resetValue,
    textOpacityAnim,
    trainTypeName,
    updateOpacity,
  ])

  const textTopAnimatedStyles = useAnimatedStyle(() => ({
    opacity: 1 - textOpacityAnim.value,
  }))
  const textBottomAnimatedStyles = useAnimatedStyle(() => ({
    opacity: textOpacityAnim.value,
  }))

  const showNextTrainType = useMemo(
    () => !!(nextLine && currentLine?.company?.id !== nextLine?.company?.id),
    [currentLine, nextLine]
  )

  // 表示に使う１行目のみの文字数で判定
  const numberOfLines = useMemo(
    () => (trainTypeName.split('\n')[0].length <= 10 ? 1 : 2),
    [trainTypeName]
  )
  const prevNumberOfLines = useMemo(
    () =>
      prevTrainTypeText
        ? prevTrainTypeText.split('\n')[0].length <= 10
          ? 1
          : 2
        : 0,
    [prevTrainTypeText]
  )

  return (
    <View>
      <View style={styles.box}>
        <LinearGradient
          colors={['#aaa', '#000', '#000', '#aaa']}
          locations={[0.5, 0.5, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={[`${trainTypeColor}ee`, `${trainTypeColor}aa`]}
          style={styles.gradient}
        />

        <View style={styles.textWrapper}>
          <Animated.Text
            style={{
              ...textTopAnimatedStyles,
              letterSpacing,
              paddingLeft,
            }}
          >
            <Typography
              adjustsFontSizeToFit
              numberOfLines={numberOfLines}
              style={{ ...styles.text, letterSpacing, paddingLeft }}
            >
              {trainTypeName}
            </Typography>
          </Animated.Text>
        </View>

        <Animated.Text
          style={{
            ...textBottomAnimatedStyles,
            letterSpacing: prevLetterSpacing,
            paddingLeft: prevPaddingLeft,
          }}
        >
          <Typography
            adjustsFontSizeToFit
            numberOfLines={prevNumberOfLines}
            style={{
              ...styles.text,
              letterSpacing: prevLetterSpacing,
              paddingLeft: prevPaddingLeft,
            }}
          >
            {prevTrainTypeText}
          </Typography>
        </Animated.Text>
      </View>
      {showNextTrainType && nextTrainType?.nameRoman ? (
        <Typography
          style={[
            styles.nextTrainType,
            {
              color: theme === APP_THEME.TY ? '#fff' : '#444',
            },
          ]}
        >
          {headerState.split('_')[1] === 'EN'
            ? `${nextLine?.company?.nameEnglishShort} Line ${truncateTrainType(
                nextTrainType?.nameRoman?.replace(parenthesisRegexp, ''),
                true
              )}`
            : `${
                nextLine?.company?.nameShort
              }線内 ${nextTrainType?.name?.replace(parenthesisRegexp, '')}`}
        </Typography>
      ) : null}
    </View>
  )
}

export default React.memo(TrainTypeBox)
