import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  EasingNode,
  sub,
  timing,
  useValue,
} from 'react-native-reanimated'
import { useRecoilValue } from 'recoil'
import { parenthesisRegexp } from '../constants/regexp'
import truncateTrainType from '../constants/truncateTrainType'
import { TrainType } from '../gen/stationapi_pb'
import useLazyPrevious from '../hooks/useLazyPrevious'
import { HeaderLangState } from '../models/HeaderTransitionState'
import { TrainTypeString } from '../models/TrainType'
import navigationState from '../store/atoms/navigation'
import tuningState from '../store/atoms/tuning'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import { getIsLocal, getIsRapid } from '../utils/trainTypeString'

type Props = {
  trainType: TrainType.AsObject | TrainTypeString
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
    maxWidth: isTablet ? 175 : 96.25,
    maxHeight: isTablet ? 55 : 30.25,
  },
  textWrapper: {
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    fontSize: isTablet ? 18 * 1.5 : 18,
    maxWidth: isTablet ? 175 : 96.25,
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
  const { headerTransitionDelay } = useRecoilValue(tuningState)
  const [animationFinished, setAnimationFinished] = useState(false)

  const textOpacityAnim = useValue<0 | 1>(0)

  const trainTypeColor = useMemo(() => {
    if (typeof trainType !== 'string') {
      if (getIsLocal(trainType)) {
        return lineColor
      }
      if (getIsRapid(trainType)) {
        return '#1e8ad2'
      }
      return trainType?.color
    }

    switch (trainType) {
      case 'local':
        return lineColor
      case 'rapid':
        return '#1e8ad2'
      case 'ltdexp':
        return '#fd5a2a'
      default:
        return '#00ac9a'
    }
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

  const trainTypeNameJa = (
    (trainType as TrainType.AsObject).name || localTypeText
  )?.replace(parenthesisRegexp, '')

  const trainTypeNameR =
    truncateTrainType(
      (trainType as TrainType.AsObject).nameRoman || translate('localEn')
    ) ?? ''

  const trainTypeNameZh = truncateTrainType(
    (trainType as TrainType.AsObject).nameChinese || translate('localZh')
  )
  const trainTypeNameKo = truncateTrainType(
    (trainType as TrainType.AsObject).nameKorean || translate('localKo')
  )

  const trainTypeName = useMemo((): string => {
    switch (headerLangState) {
      case 'EN':
        return trainTypeNameR ?? ''
      case 'ZH':
        return trainTypeNameZh ?? ''
      case 'KO':
        return trainTypeNameKo ?? ''
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

  const rapidTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return translate('rapidEn')
      case 'ZH':
        return translate('rapidZh')
      case 'KO':
        return translate('rapidKo')
      default:
        return translate('rapid')
    }
  }, [headerLangState])
  const ltdExpTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return truncateTrainType(translate('ltdExpEn'))
      case 'ZH':
        return translate('ltdExpZh')
      case 'KO':
        return translate('ltdExpKo')
      default:
        return translate('ltdExp')
    }
  }, [headerLangState])

  const animateAsync = useCallback(
    () =>
      new Promise<void>((resolve) => {
        timing(textOpacityAnim, {
          toValue: 0,
          duration: headerTransitionDelay,
          easing: EasingNode.ease,
        }).start(({ finished }) => finished && resolve())
      }),
    [headerTransitionDelay, textOpacityAnim]
  )

  const trainTypeText = useMemo((): string => {
    switch (trainType) {
      case 'local':
        return localTypeText
      case 'rapid':
        return rapidTypeText
      case 'ltdexp':
        return ltdExpTypeText
      default:
        if (typeof trainType === 'string') {
          return ''
        }
        return trainTypeName
    }
  }, [localTypeText, ltdExpTypeText, rapidTypeText, trainType, trainTypeName])

  const isEn = useMemo(() => headerLangState === 'EN', [headerLangState])

  const letterSpacing = useMemo((): number => {
    if (!isEn) {
      if (trainType === 'rapid' || trainTypeName?.length === 2) {
        return 8
      }
    }
    return 0
  }, [isEn, trainType, trainTypeName])

  const paddingLeft = useMemo((): number => {
    if (!isEn) {
      if (trainType === 'rapid' || trainTypeName?.length === 2) {
        return 8
      }
    }
    return 0
  }, [isEn, trainType, trainTypeName])

  const prevTrainTypeText = useLazyPrevious(trainTypeText, animationFinished)
  const prevPaddingLeft = useLazyPrevious(paddingLeft, animationFinished)
  const prevLetterSpacing = useLazyPrevious(letterSpacing, animationFinished)

  useEffect(() => {
    if (prevTrainTypeText !== trainTypeText) {
      textOpacityAnim.setValue(1)
    }
  }, [headerState, prevTrainTypeText, textOpacityAnim, trainTypeText])

  useEffect(() => {
    const updateAsync = async () => {
      setAnimationFinished(false)
      if (trainTypeText !== prevTrainTypeText) {
        await animateAsync()
        setAnimationFinished(true)
      }
    }
    updateAsync()
  }, [animateAsync, prevTrainTypeText, trainTypeText])

  const textTopAnimatedStyles = {
    opacity: sub(1, textOpacityAnim),
  }

  const textBottomAnimatedStyles = {
    opacity: textOpacityAnim,
  }

  const numberOfLines = useMemo(
    () => (trainTypeText.length <= 10 ? 1 : 2),
    [trainTypeText.length]
  )
  const prevNumberOfLines = useMemo(
    () => (prevTrainTypeText.length <= 10 ? 1 : 2),
    [prevTrainTypeText.length]
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
              {
                ...textTopAnimatedStyles,
                ...styles.text,
                paddingLeft,
                letterSpacing,
              },
            ]}
          >
            {trainTypeText}
          </Animated.Text>
        </View>
        <View style={styles.textWrapper}>
          <Animated.Text
            adjustsFontSizeToFit
            numberOfLines={prevNumberOfLines}
            style={[
              {
                ...textBottomAnimatedStyles,
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
