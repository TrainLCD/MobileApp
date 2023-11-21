import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useMemo } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
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
import { usePrevious } from '../hooks/usePrevious'
import { HeaderLangState } from '../models/HeaderTransitionState'
import navigationState from '../store/atoms/navigation'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import { getIsLocal, getIsRapid } from '../utils/trainTypeString'
import truncateTrainType from '../utils/truncateTrainType'

type Props = {
  trainType: TrainType.AsObject | null
  lineColor: string
}

const styles = StyleSheet.create({
  root: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: isTablet ? 8 : 4,
    borderBottomRightRadius: isTablet ? 8 : 4,
    overflow: 'hidden',
    borderLeftWidth: isTablet ? 0.5 : 0.75,
    borderRightWidth: isTablet ? 0.5 : 0.75,
    borderBottomWidth: isTablet ? 0.5 : 0.75,
    borderColor: 'white',
  },
  container: {
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    borderBottomLeftRadius: isTablet ? 8 : 4,
    borderBottomRightRadius: isTablet ? 8 : 4,
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    position: 'absolute',
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
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
})

const TrainTypeBoxSaikyo: React.FC<Props> = ({
  trainType,
  lineColor,
}: Props) => {
  const { headerState } = useRecoilValue(navigationState)

  const textOpacityAnim = useSharedValue(0)

  const trainTypeColor = useMemo(() => {
    if (getIsLocal(trainType)) {
      return lineColor
    }
    if (getIsRapid(trainType)) {
      return '#1e8ad2'
    }

    return trainType?.color ?? lineColor
  }, [lineColor, trainType])
  const headerLangState = useMemo((): HeaderLangState => {
    return headerState.split('_')[1] as HeaderLangState
  }, [headerState])

  const localTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return translate('localEn')
      case 'ZH':
        return translate('localZh')
      case 'KO':
        return translate('localKo')
      default:
        return translate('local')
    }
  }, [headerLangState])

  const trainTypeNameJa = (trainType?.name || localTypeText)?.replace(
    parenthesisRegexp,
    ''
  )

  const trainTypeNameR =
    truncateTrainType(trainType?.nameRoman || translate('localEn')) ?? ''

  const trainTypeNameZh = truncateTrainType(
    trainType?.nameChinese || translate('localZh')
  )
  const trainTypeNameKo = truncateTrainType(
    trainType?.nameKorean || translate('localKo')
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

  const numberOfLines = useMemo(
    () => (trainTypeName.length <= 10 ? 1 : 2),
    [trainTypeName.length]
  )
  const prevNumberOfLines = useMemo(
    () => ((prevTrainTypeText?.length ?? 0) <= 10 ? 1 : 2),
    [prevTrainTypeText?.length]
  )

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#000', '#000', '#fff']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={['#aaaaaaff', '#aaaaaabb']}
          style={styles.gradient}
        />
        <LinearGradient
          colors={['#000', '#000', '#fff']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={[`${trainTypeColor}bb`, `${trainTypeColor}ff`]}
          style={styles.gradient}
        />

        <View style={styles.textWrapper}>
          <Animated.Text
            adjustsFontSizeToFit
            numberOfLines={numberOfLines}
            style={[
              textTopAnimatedStyles,
              {
                ...styles.text,
                paddingLeft,
                letterSpacing,
              },
            ]}
          >
            {trainTypeName}
          </Animated.Text>
        </View>
        <View style={styles.textWrapper}>
          <Animated.Text
            adjustsFontSizeToFit
            numberOfLines={prevNumberOfLines}
            style={[
              textBottomAnimatedStyles,
              {
                ...styles.text,
                paddingLeft: prevPaddingLeft,
                letterSpacing: prevLetterSpacing,
              },
            ]}
          >
            {prevTrainTypeText}
          </Animated.Text>
        </View>
      </View>
    </View>
  )
}

export default React.memo(TrainTypeBoxSaikyo)
