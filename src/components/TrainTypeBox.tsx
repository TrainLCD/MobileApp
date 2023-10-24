import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  sub,
  timing,
  useValue,
} from 'react-native-reanimated'
import { useRecoilValue } from 'recoil'
import { parenthesisRegexp } from '../constants/regexp'
import truncateTrainType from '../constants/truncateTrainType'
import { TrainType } from '../gen/stationapi_pb'
import { useCurrentLine } from '../hooks/useCurrentLine'
import useLazyPrevious from '../hooks/useLazyPrevious'
import useNextLine from '../hooks/useNextLine'
import useNextTrainType from '../hooks/useNextTrainType'
import { HeaderLangState } from '../models/HeaderTransitionState'
import { APP_THEME } from '../models/Theme'
import navigationState from '../store/atoms/navigation'
import themeState from '../store/atoms/theme'
import tuningState from '../store/atoms/tuning'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import Typography from './Typography'
import { getIsLocal, getIsLtdExp, getIsRapid } from '../utils/trainTypeString'

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
    padding: 10,
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
  const { headerTransitionDelay } = useRecoilValue(tuningState)
  const textOpacityAnim = useValue<0 | 1>(0)
  const [animationFinished, setAnimationFinished] = useState(false)

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
    if (getIsLtdExp(trainType)) {
      return '#fd5a2a'
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

  const animateAsync = useCallback(
    () =>
      new Promise<void>((resolve) => {
        timing(textOpacityAnim, {
          toValue: 0,
          duration: headerTransitionDelay,
          easing: Easing.ease,
        }).start(({ finished }) => finished && resolve())
      }),
    [headerTransitionDelay, textOpacityAnim]
  )

  const letterSpacing = useMemo(() => {
    if (trainTypeName?.length === 2) {
      return 8
    }
    return 0
  }, [trainTypeName?.length])

  const prevLetterSpacing = useLazyPrevious(letterSpacing, animationFinished)

  const paddingLeft = useMemo(() => {
    if (trainTypeName?.length === 2) {
      return 8
    }
    return 0
  }, [trainTypeName?.length])

  const prevPaddingLeft = useLazyPrevious(paddingLeft, animationFinished)

  const prevTrainTypeText = useLazyPrevious(trainTypeName, animationFinished)

  useEffect(() => {
    const updateAsync = async () => {
      setAnimationFinished(false)
      if (trainTypeName !== prevTrainTypeText) {
        await animateAsync()
        setAnimationFinished(true)
      }
    }
    updateAsync()
  }, [animateAsync, prevTrainTypeText, trainTypeName])

  useEffect(() => {
    if (prevTrainTypeText !== trainTypeName) {
      textOpacityAnim.setValue(1)
    }
  }, [headerState, prevTrainTypeText, textOpacityAnim, trainTypeName])

  const textTopAnimatedStyles = {
    opacity: sub(1, textOpacityAnim),
  }

  const textBottomAnimatedStyles = {
    opacity: textOpacityAnim,
  }

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
    () => (prevTrainTypeText.split('\n')[0].length <= 10 ? 1 : 2),
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

        <Animated.View style={[styles.textWrapper, textTopAnimatedStyles]}>
          <Typography
            adjustsFontSizeToFit
            numberOfLines={numberOfLines}
            style={[
              {
                ...styles.text,
                paddingLeft,
                letterSpacing,
              },
            ]}
          >
            {trainTypeName}
          </Typography>
        </Animated.View>

        <Animated.View style={[styles.textWrapper, textBottomAnimatedStyles]}>
          <Typography
            adjustsFontSizeToFit
            numberOfLines={prevNumberOfLines}
            style={[
              {
                ...styles.text,
                paddingLeft: prevPaddingLeft,
                letterSpacing: prevLetterSpacing,
              },
            ]}
          >
            {prevTrainTypeText}
          </Typography>
        </Animated.View>
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
