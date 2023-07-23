/* eslint-disable global-require */
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilValue } from 'recoil'
import { STATION_NAME_FONT_SIZE } from '../constants'
import useCurrentLine from '../hooks/useCurrentLine'
import useIsNextLastStop from '../hooks/useIsNextLastStop'
import useLoopLineBound from '../hooks/useLoopLineBound'
import useNextStation from '../hooks/useNextStation'
import useNumbering from '../hooks/useNumbering'
import { HeaderLangState } from '../models/HeaderTransitionState'

import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import katakanaToHiragana from '../utils/kanaToHiragana'
import { getIsLoopLine, getIsMeijoLine } from '../utils/loopLine'
import { getNumberingColor } from '../utils/numbering'

import { Image } from 'expo-image'
import { NUMBERING_ICON_SIZE } from '../constants/numbering'
import { parenthesisRegexp } from '../constants/regexp'
import useCurrentStation from '../hooks/useCurrentStation'
import useGetLineMark from '../hooks/useGetLineMark'

import { LineType } from '../gen/stationapi_pb'
import { getIsLtdExp, getTrainTypeString } from '../utils/trainTypeString'
import NumberingIcon from './NumberingIcon'
import TransferLineMark from './TransferLineMark'
import Typography from './Typography'
import VisitorsPanel from './VisitorsPanel'

const HeaderJRWest: React.FC = () => {
  const { headerState, trainType } = useRecoilValue(navigationState)
  const { selectedBound, arrived, selectedDirection } =
    useRecoilValue(stationState)
  const [stateText, setStateText] = useState(translate('nowStoppingAt'))
  const station = useCurrentStation()

  const [stationText, setStationText] = useState(station?.name || '')
  const [boundText, setBoundText] = useState('TrainLCD')

  const currentLine = useCurrentLine()
  const loopLineBound = useLoopLineBound()
  const isLast = useIsNextLastStop()
  const nextStation = useNextStation()

  const isLoopLine = currentLine && getIsLoopLine(currentLine, trainType)

  const headerLangState = headerState.split('_')[1] as HeaderLangState

  const currentLineIsMeijo = useMemo(
    () => currentLine && getIsMeijoLine(currentLine.id),
    [currentLine]
  )

  const boundPrefix = useMemo(() => {
    if (currentLineIsMeijo || !selectedBound) {
      return ''
    }
    switch (headerLangState) {
      case 'EN':
        return 'for'
      case 'ZH':
        return '开往'
      default:
        return ''
    }
  }, [currentLineIsMeijo, headerLangState, selectedBound])

  const boundSuffix = useMemo(() => {
    if (currentLineIsMeijo || !selectedBound) {
      return ''
    }
    switch (headerLangState) {
      case 'EN':
        return ''
      case 'ZH':
        return ''
      case 'KO':
        return '행'
      default:
        return getIsLoopLine(currentLine, trainType) ? '方面' : 'ゆき'
    }
  }, [
    currentLineIsMeijo,
    selectedBound,
    headerLangState,
    currentLine,
    trainType,
  ])

  const boundStationName = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return selectedBound?.nameRoman
      case 'ZH':
        return selectedBound?.nameChinese
      case 'KO':
        return selectedBound?.nameKorean
      default:
        return selectedBound?.name
    }
  }, [
    headerLangState,
    selectedBound?.name,
    selectedBound?.nameChinese,
    selectedBound?.nameKorean,
    selectedBound?.nameRoman,
  ])

  useEffect(() => {
    if (!selectedBound) {
      setBoundText('TrainLCD')
      return
    }
    if (isLoopLine && !trainType) {
      setBoundText(loopLineBound?.boundFor ?? '')
      return
    }
    setBoundText(boundStationName ?? '')
  }, [
    boundPrefix,
    boundStationName,
    boundSuffix,
    isLoopLine,
    loopLineBound?.boundFor,
    selectedBound,
    trainType,
  ])

  useEffect(() => {
    if (!selectedBound && station) {
      setStateText(translate('nowStoppingAt'))
      setStationText(station.name)
    }

    switch (headerState) {
      case 'ARRIVING':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonLast' : 'soon'))
          setStationText(nextStation.name)
        }
        break
      case 'ARRIVING_KANA':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonKanaLast' : 'soon'))
          setStationText(katakanaToHiragana(nextStation.nameKatakana))
        }
        break
      case 'ARRIVING_EN':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonEnLast' : 'soonEn'))
          setStationText(nextStation.nameRoman)
        }
        break
      case 'ARRIVING_ZH':
        if (nextStation?.nameChinese) {
          setStateText(translate(isLast ? 'soonZhLast' : 'soonZh'))
          setStationText(nextStation.nameChinese)
        }
        break
      case 'ARRIVING_KO':
        if (nextStation?.nameKorean) {
          setStateText(translate(isLast ? 'soonKoLast' : 'soonKo'))
          setStationText(nextStation.nameKorean)
        }
        break
      case 'CURRENT':
        if (station) {
          setStateText(translate('nowStoppingAt'))
          setStationText(station.name)
        }
        break
      case 'CURRENT_KANA':
        if (station) {
          setStateText(translate('nowStoppingAt'))
          setStationText(katakanaToHiragana(station.nameKatakana))
        }
        break
      case 'CURRENT_EN':
        if (station) {
          setStateText('')
          setStationText(station.nameRoman)
        }
        break
      case 'CURRENT_ZH':
        if (!station?.nameChinese) {
          break
        }
        setStateText('')
        setStationText(station.nameChinese)
        break
      case 'CURRENT_KO':
        if (!station?.nameKorean) {
          break
        }
        setStateText('')
        setStationText(station.nameKorean)
        break
      case 'NEXT':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextLast' : 'next'))
          setStationText(nextStation.name)
        }
        break
      case 'NEXT_KANA':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextKanaLast' : 'nextKana'))
          setStationText(katakanaToHiragana(nextStation.nameKatakana))
        }
        break
      case 'NEXT_EN':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextEnLast' : 'nextEn'))
          setStationText(nextStation.nameRoman)
        }
        break
      case 'NEXT_ZH':
        if (nextStation?.nameChinese) {
          setStateText(translate(isLast ? 'nextZhLast' : 'nextZh'))
          setStationText(nextStation.nameChinese)
        }
        break
      case 'NEXT_KO':
        if (nextStation?.nameKorean) {
          setStateText(translate(isLast ? 'nextKoLast' : 'nextKo'))
          setStationText(nextStation.nameKorean)
        }
        break
      default:
        break
    }
  }, [headerState, isLast, nextStation, selectedBound, station])

  const styles = StyleSheet.create({
    gradientRoot: {
      paddingRight: 21,
      paddingLeft: 21,
      height: isTablet ? 210 : 150,
      flexDirection: 'row',
    },
    bound: {
      position: 'absolute',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: RFValue(24),
      top: 32,
      left: 32,
    },
    stationNameContainer: {
      marginLeft: isTablet ? 72 * 1.5 : 72,
      justifyContent: 'center',
      alignItems: 'center',
      height: STATION_NAME_FONT_SIZE * 2 - 24,
    },
    stationName: {
      textAlign: 'center',
      fontSize: STATION_NAME_FONT_SIZE,
      fontWeight: 'bold',
      color: '#fff',
    },
    top: {
      position: 'absolute',
      width: '20%',
      top: 24,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    left: {
      flex: 0.3,
      justifyContent: 'center',
      height: '100%',
      marginTop: 48,
    },
    right: {
      flex: 1,
      justifyContent: 'flex-end',
      alignContent: 'center',
      height: isTablet ? 200 : 150,
    },
    state: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: RFValue(24),
      textAlign: 'center',
      marginBottom: isTablet ? 0 : 12,
    },
    trainTypeImageContainer: {
      width: '100%',
      marginLeft: 4,
    },
    trainTypeImage: {
      height: '100%',
    },
    numberingContainer: {
      position: 'absolute',
      bottom: isTablet ? 0 : 8,
    },
    emptyNumbering: {
      width: isTablet ? 35 * 1.5 : 35,
      height: isTablet ? 35 * 1.5 : 35,
    },
  })

  const fetchJRWLocalLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/local_en.png')
      case 'ZH':
        return require('../../assets/jrwest/local_zh.png')
      case 'KO':
        return require('../../assets/jrwest/local_ko.png')
      default:
        return require('../../assets/jrwest/local.png')
    }
  }, [headerLangState])

  const fetchJRWRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/rapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/rapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/rapid_ko.png')
      default:
        return require('../../assets/jrwest/rapid.png')
    }
  }, [headerLangState])
  const fetchJRWSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/specialrapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/specialrapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/specialrapid_ko.png')
      default:
        return require('../../assets/jrwest/specialrapid.png')
    }
  }, [headerLangState])
  const fetchJRWExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/express_en.png')
      case 'ZH':
        return require('../../assets/jrwest/express_zh.png')
      case 'KO':
        return require('../../assets/jrwest/express_ko.png')
      default:
        return require('../../assets/jrwest/express.png')
    }
  }, [headerLangState])
  const fetchJRWLtdExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/ltdexpress_en.png')
      case 'ZH':
        return require('../../assets/jrwest/ltdexpress_zh.png')
      case 'KO':
        return require('../../assets/jrwest/ltdexpress_ko.png')
      default:
        return require('../../assets/jrwest/ltdexpress.png')
    }
  }, [headerLangState])
  const fetchJRWRegionalRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/regionalrapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/regionalrapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/regionalrapid_ko.png')
      default:
        return require('../../assets/jrwest/regionalrapid.png')
    }
  }, [headerLangState])
  const fetchJRWRegionalExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/regionalexpress_en.png')
      case 'ZH':
        return require('../../assets/jrwest/regionalexpress_zh.png')
      case 'KO':
        return require('../../assets/jrwest/regionalexpress_ko.png')
      default:
        return require('../../assets/jrwest/regionalexpress.png')
    }
  }, [headerLangState])
  const fetchJRWKansaiAirportRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/kansaiairportrapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/kansaiairportrapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/kansaiairportrapid_ko.png')
      default:
        return require('../../assets/jrwest/kansaiairportrapid.png')
    }
  }, [headerLangState])
  const fetchJRWKishujiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/kishujirapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/kishujirapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/kishujirapid_ko.png')
      default:
        return require('../../assets/jrwest/kishujirapid.png')
    }
  }, [headerLangState])
  const fetchJRWMiyakojiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/miyakojirapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/miyakojirapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/miyakojirapid_ko.png')
      default:
        return require('../../assets/jrwest/miyakojirapid.png')
    }
  }, [headerLangState])
  const fetchJRWYamatojiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/yamatojirapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/yamatojirapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/yamatojirapid_ko.png')
      default:
        return require('../../assets/jrwest/yamatojirapid.png')
    }
  }, [headerLangState])
  const fetchJRWTambajiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/tambajirapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/tambajirapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/tambajirapid_ko.png')
      default:
        return require('../../assets/jrwest/tambajirapid.png')
    }
  }, [headerLangState])
  const fetchKeikyuAPLtdExpressRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/keikyuairportltdexpress_en.png')
      case 'ZH':
        return require('../../assets/jrwest/keikyuairportltdexpress_zh.png')
      case 'KO':
        return require('../../assets/jrwest/keikyuairportltdexpress_ko.png')
      default:
        return require('../../assets/jrwest/keikyuairportltdexpress.png')
    }
  }, [headerLangState])
  const fetchKeikyuAPExpressRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/keikyuairtportexpress_en.png')
      case 'ZH':
        return require('../../assets/jrwest/keikyuairtportexpress_zh.png')
      case 'KO':
        return require('../../assets/jrwest/keikyuairtportexpress_ko.png')
      default:
        return require('../../assets/jrwest/keikyuairtportexpress.png')
    }
  }, [headerLangState])
  const fetchKeikyuLtdExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/keikyultdexpress_en.png')
      case 'ZH':
        return require('../../assets/jrwest/keikyultdexpress_zh.png')
      case 'KO':
        return require('../../assets/jrwest/keikyultdexpress_ko.png')
      default:
        return require('../../assets/jrwest/keikyultdexpress.png')
    }
  }, [headerLangState])
  const fetchJRESpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrespecialrapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/jrespecialrapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/jrespecialrapid_ko.png')
      default:
        return require('../../assets/jrwest/jrespecialrapid.png')
    }
  }, [headerLangState])
  const fetchJRECommuterRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrecommuterrapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/jrecommuterrapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/jrecommuterrapid_ko.png')
      default:
        return require('../../assets/jrwest/jrecommuterrapid.png')
    }
  }, [headerLangState])
  const fetchJRECommuterSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrecommuterspecialrapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/jrecommuterspecialrapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/jrecommuterspecialrapid_ko.png')
      default:
        return require('../../assets/jrwest/jrecommuterspecialrapid.png')
    }
  }, [headerLangState])
  const fetchJRWDirectRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/directrapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/directrapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/directrapid_ko.png')
      default:
        return require('../../assets/jrwest/directrapid.png')
    }
  }, [headerLangState])
  const fetchJREChuoLineSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrechuolinespecialrapid_en.png')
      case 'ZH':
        return require('../../assets/jrwest/jrechuolinespecialrapid_zh.png')
      case 'KO':
        return require('../../assets/jrwest/jrechuolinespecialrapid_ko.png')
      default:
        return require('../../assets/jrwest/jrechuolinespecialrapid.png')
    }
  }, [headerLangState])

  const trainTypeName = trainType?.name.replace(parenthesisRegexp, '') || ''

  const trainTypeImage = useMemo((): number => {
    if (!station) {
      return fetchJRWLocalLogo()
    }
    switch (trainTypeName) {
      case '急行':
        return fetchJRWExpressLogo()
      case '特急':
        return fetchJRWLtdExpressLogo()
      case '区間快速':
        return fetchJRWRegionalRapidLogo()
      case '区間急行':
        return fetchJRWRegionalExpressLogo()
      case '関空快速':
        return fetchJRWKansaiAirportRapidLogo()
      case '紀州路快速':
        return fetchJRWKishujiRapidLogo()
      case 'みやこ路快速':
        return fetchJRWMiyakojiRapidLogo()
      case '大和路快速':
        return fetchJRWYamatojiRapidLogo()
      case '丹波路快速':
        return fetchJRWTambajiRapidLogo()
      case '快特':
        return fetchKeikyuLtdExpressLogo()
      case 'エアポート快特':
        return fetchKeikyuAPLtdExpressRapidLogo()
      case 'エアポート急行':
        return fetchKeikyuAPExpressRapidLogo()
      case '特別快速':
        return fetchJRESpecialRapidLogo()
      case '通勤快速':
        return fetchJRECommuterRapidLogo()
      case '通勤特快':
        return fetchJRECommuterSpecialRapidLogo()
      case '直通快速':
        return fetchJRWDirectRapidLogo()
      case '新快速':
        return fetchJRWSpecialRapidLogo()
      default:
        break
    }
    if (
      (trainType && getIsLtdExp(trainType)) ||
      currentLine?.lineType === LineType.BULLETTRAIN
    ) {
      return fetchJRWLtdExpressLogo()
    }
    if (trainTypeName.includes('特快')) {
      return fetchJREChuoLineSpecialRapidLogo()
    }
    if (trainTypeName.includes('特急')) {
      return fetchJRWLtdExpressLogo()
    }
    if (trainTypeName.includes('急')) {
      return fetchJRWExpressLogo()
    }
    if (
      getTrainTypeString(currentLine, station, selectedDirection) === 'rapid' ||
      trainTypeName.endsWith('快速')
    ) {
      return fetchJRWRapidLogo()
    }
    return fetchJRWLocalLogo()
  }, [
    currentLine,
    fetchJREChuoLineSpecialRapidLogo,
    fetchJRECommuterRapidLogo,
    fetchJRECommuterSpecialRapidLogo,
    fetchJRESpecialRapidLogo,
    fetchJRWDirectRapidLogo,
    fetchJRWExpressLogo,
    fetchJRWKansaiAirportRapidLogo,
    fetchJRWKishujiRapidLogo,
    fetchJRWLocalLogo,
    fetchJRWLtdExpressLogo,
    fetchJRWMiyakojiRapidLogo,
    fetchJRWRapidLogo,
    fetchJRWRegionalExpressLogo,
    fetchJRWRegionalRapidLogo,
    fetchJRWSpecialRapidLogo,
    fetchJRWTambajiRapidLogo,
    fetchJRWYamatojiRapidLogo,
    fetchKeikyuAPExpressRapidLogo,
    fetchKeikyuAPLtdExpressRapidLogo,
    fetchKeikyuLtdExpressLogo,
    selectedDirection,
    station,
    trainType,
    trainTypeName,
  ])

  const [currentStationNumber, threeLetterCode] = useNumbering()

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
  const getLineMarkFunc = useGetLineMark()
  const mark = useMemo(
    () =>
      currentLine &&
      getLineMarkFunc({ station: station ?? undefined, line: currentLine }),
    [currentLine, getLineMarkFunc, station]
  )

  return (
    <View>
      <LinearGradient
        colors={['#222222', '#212121']}
        style={styles.gradientRoot}
      >
        <VisitorsPanel />
        <View style={{ ...styles.top, left: mark && mark.sign ? 64 : 32 }}>
          {mark ? (
            <TransferLineMark
              line={currentLine}
              mark={mark}
              color={numberingColor}
              size={NUMBERING_ICON_SIZE.MEDIUM}
            />
          ) : (
            <View style={styles.emptyNumbering} />
          )}
          <View style={styles.trainTypeImageContainer}>
            <Image
              style={styles.trainTypeImage}
              source={trainTypeImage}
              cachePolicy="memory"
            />
          </View>
        </View>
        <View style={styles.left}>
          <Typography
            adjustsFontSizeToFit
            numberOfLines={2}
            style={styles.state}
          >
            {stateText}
          </Typography>
        </View>

        <View style={styles.right}>
          <Typography style={styles.bound}>
            {`${boundPrefix} ${boundText} ${boundSuffix}`}
          </Typography>
          {currentStationNumber ? (
            <View style={styles.numberingContainer}>
              <NumberingIcon
                shape={currentStationNumber.lineSymbolShape}
                lineColor={numberingColor}
                stationNumber={currentStationNumber.stationNumber}
                threeLetterCode={threeLetterCode}
              />
            </View>
          ) : null}
          <View style={styles.stationNameContainer}>
            <Typography
              adjustsFontSizeToFit
              numberOfLines={1}
              style={styles.stationName}
            >
              {stationText}
            </Typography>
          </View>
        </View>
      </LinearGradient>
    </View>
  )
}

export default HeaderJRWest
