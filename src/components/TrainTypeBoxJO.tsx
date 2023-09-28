import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRecoilValue } from 'recoil'
import { parenthesisRegexp } from '../constants/regexp'
import truncateTrainType from '../constants/truncateTrainType'
import { TrainType } from '../gen/stationapi_pb'
import { HeaderLangState } from '../models/HeaderTransitionState'
import { TrainTypeString } from '../models/TrainType'
import navigationState from '../store/atoms/navigation'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import Typography from './Typography'

type Props = {
  trainType: TrainType.AsObject | TrainTypeString
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: isTablet ? 24 : 12,
    borderRadius: 4,
    width: '100%',
    height: isTablet ? 55 : 35,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: 'white',
    flexDirection: 'row',
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    transform: [{ skewX: '-5deg' }],
    fontSize: isTablet ? 36 : 24,
  },
})

const TrainTypeBoxJO: React.FC<Props> = ({
  trainType: untypedTrainType,
}: Props) => {
  const { headerState } = useRecoilValue(navigationState)

  const trainType = untypedTrainType as TrainType.AsObject
  const trainTypeString = untypedTrainType as TrainTypeString

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
        return translate('local2')
    }
  }, [headerLangState])

  const trainTypeNameJa = (trainType.name || localTypeText)?.replace(
    parenthesisRegexp,
    ''
  )
  const trainTypeNameR = truncateTrainType(
    trainType.nameRoman || translate('localEn')
  )
  const trainTypeNameZh = truncateTrainType(
    trainType.nameChinese || translate('localZh')
  )
  const trainTypeNameKo = truncateTrainType(
    trainType.nameKorean || translate('localKo')
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

  const trainTypeText = useMemo(() => {
    switch (trainTypeString) {
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
  }, [
    localTypeText,
    ltdExpTypeText,
    rapidTypeText,
    trainType,
    trainTypeName,
    trainTypeString,
  ])

  return (
    <View style={styles.box}>
      {!headerLangState || headerLangState === 'KANA' ? (
        trainTypeText.split('').map((char, idx) => (
          <Typography
            style={{
              ...styles.text,
              color: trainType.color ?? '#222',
              fontFamily: undefined,
              fontWeight: '900',
            }}
            key={`${char}${idx.toString()}`}
          >
            {char}
          </Typography>
        ))
      ) : (
        <Typography
          style={{
            ...styles.text,
            color: trainType.color ?? '#222',
          }}
        >
          {trainTypeText}
        </Typography>
      )}
    </View>
  )
}

export default React.memo(TrainTypeBoxJO)
