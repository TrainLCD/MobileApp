import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useMemo, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilValue } from 'recoil'
import useCurrentLine from '../hooks/useCurrentLine'
import useCurrentStation from '../hooks/useCurrentStation'
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
import { getIsLoopLine, isMeijoLine } from '../utils/loopLine'
import { getNumberingColor } from '../utils/numbering'
import prependHEX from '../utils/prependHEX'
import Clock from './Clock'
import NumberingIcon from './NumberingIcon'
import Typography from './Typography'
import VisitorsPanel from './VisitorsPanel'

const styles = StyleSheet.create({
  gradientRoot: {
    paddingLeft: 24,
    overflow: 'hidden',
    height: isTablet ? 200 : 128,
    flexDirection: 'row',
  },
  boundContainer: {
    alignSelf: 'flex-start',
  },
  bound: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: RFValue(24),
  },
  boundGrayText: {
    fontSize: RFValue(18),
    color: '#aaa',
    fontWeight: 'normal',
  },
  boundSuffix: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
    textAlign: 'right',
  },
  suffixBoundText: {},
  stationName: {
    fontWeight: 'bold',
    color: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    flexWrap: 'wrap',
    flex: 1,
    textAlign: 'center',
    fontSize: RFValue(55),
  },
  left: {
    flex: 0.3,
    justifyContent: 'center',
    height: isTablet ? 200 : 128,
    marginRight: 24,
  },
  right: {
    flex: 1,
    justifyContent: 'center',
    height: isTablet ? 200 : 128,
  },
  state: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: RFValue(21),
    position: 'absolute',
    top: 12,
  },
  colorBar: {
    width: isTablet ? 48 : 38,
    height: isTablet ? 190 : 120,
    marginRight: 16,
  },
  clockOverride: {
    position: 'absolute',
    top: 8,
    right: Dimensions.get('window').width * 0.25,
  },
  stationNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
    marginBottom: 8,
  },
})

const HeaderYamanote: React.FC = () => {
  const station = useCurrentStation()
  const nextStation = useNextStation()

  const [stateText, setStateText] = useState(translate('nowStoppingAt'))
  const [stationText, setStationText] = useState(station?.name || '')
  const [boundText, setBoundText] = useState('TrainLCD')
  const { headerState, trainType } = useRecoilValue(navigationState)
  const { selectedBound, arrived } = useRecoilValue(stationState)
  const currentLine = useCurrentLine()
  const loopLineBound = useLoopLineBound()
  const isLast = useIsNextLastStop()

  const isLoopLine = currentLine && getIsLoopLine(currentLine, trainType)

  const headerLangState = useMemo(
    () => headerState.split('_')[1] as HeaderLangState,
    [headerState]
  )

  const [currentStationNumber, threeLetterCode, lineMarkShape] = useNumbering()
  const lineColor = useMemo(
    () => currentLine?.lineColorC && prependHEX(currentLine.lineColorC),
    [currentLine]
  )
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

  useEffect(() => {
    if (!selectedBound) {
      setBoundText('TrainLCD')
      return
    }
    if (isLoopLine && !trainType) {
      setBoundText(loopLineBound?.boundFor ?? '')
      return
    }
    const selectedBoundName = (() => {
      switch (headerLangState) {
        case 'EN':
          return selectedBound.nameR
        case 'ZH':
          return selectedBound.nameZh
        case 'KO':
          return selectedBound.nameKo
        default:
          return selectedBound.name
      }
    })()

    setBoundText(selectedBoundName)
  }, [
    headerLangState,
    isLoopLine,
    loopLineBound?.boundFor,
    selectedBound,
    trainType,
  ])

  useEffect(() => {
    if (!station) {
      return
    }

    switch (headerState) {
      case 'ARRIVING':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'soonLast' : 'soon').replace(/\n/, ' ')
          )
          setStationText(nextStation.name)
        }
        break
      case 'ARRIVING_KANA':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'soonKanaLast' : 'soon').replace(/\n/, ' ')
          )
          setStationText(katakanaToHiragana(nextStation.nameK))
        }
        break
      case 'ARRIVING_EN':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'soonEnLast' : 'soonEn').replace(/\n/, ' ')
          )
          setStationText(nextStation.nameR)
        }
        break
      case 'ARRIVING_ZH':
        if (nextStation?.nameZh) {
          setStateText(
            translate(isLast ? 'soonZhLast' : 'soonZh').replace(/\n/, ' ')
          )
          setStationText(nextStation.nameZh)
        }
        break
      case 'ARRIVING_KO':
        if (nextStation?.nameKo) {
          setStateText(
            translate(isLast ? 'soonKoLast' : 'soonKo').replace(/\n/, ' ')
          )
          setStationText(nextStation.nameKo)
        }
        break
      case 'CURRENT':
        setStateText(translate('nowStoppingAt'))
        setStationText(station.name)
        break
      case 'CURRENT_KANA':
        setStateText(translate('nowStoppingAt'))
        setStationText(katakanaToHiragana(station.nameK))
        break
      case 'CURRENT_EN':
        setStateText(translate('nowStoppingAtEn'))
        setStationText(station.nameR)
        break
      case 'CURRENT_ZH':
        if (!station.nameZh) {
          break
        }
        setStateText(translate('nowStoppingAtZh'))
        setStationText(station.nameZh)
        break
      case 'CURRENT_KO':
        if (!station.nameKo) {
          break
        }
        setStateText(translate('nowStoppingAtKo'))
        setStationText(station.nameKo)
        break
      case 'NEXT':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'nextLast' : 'next').replace(/\n/, ' ')
          )
          setStationText(nextStation.name)
        }
        break
      case 'NEXT_KANA':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'nextKanaLast' : 'nextKana').replace(/\n/, ' ')
          )
          setStationText(katakanaToHiragana(nextStation.nameK))
        }
        break
      case 'NEXT_EN':
        if (nextStation) {
          if (isLast) {
            // 2単語以降はlower caseにしたい
            // Next Last Stop -> Next last stop
            const smallCapitalizedLast = translate('nextEnLast')
              .split('\n')
              .map((letters, index) =>
                !index ? letters : letters.toLowerCase()
              )
              .join(' ')
            setStateText(smallCapitalizedLast)
          } else {
            setStateText(translate('nextEn').replace(/\n/, ' '))
          }

          setStationText(nextStation.nameR)
        }
        break
      case 'NEXT_ZH':
        if (nextStation?.nameZh) {
          setStateText(
            translate(isLast ? 'nextZhLast' : 'nextZh').replace(/\n/, ' ')
          )
          setStationText(nextStation.nameZh)
        }
        break
      case 'NEXT_KO':
        if (nextStation?.nameKo) {
          setStateText(
            translate(isLast ? 'nextKoLast' : 'nextKo').replace(/\n/, ' ')
          )
          setStationText(nextStation.nameKo)
        }
        break
      default:
        break
    }
  }, [headerState, isLast, nextStation, station])

  const currentLineIsMeijo = useMemo(
    () => currentLine && isMeijoLine(currentLine.id),
    [currentLine]
  )

  const boundPrefix = useMemo(() => {
    if (currentLineIsMeijo) {
      return ''
    }
    switch (headerLangState) {
      case 'EN':
        return 'Bound for'
      case 'ZH':
        return '开往'
      default:
        return ''
    }
  }, [currentLineIsMeijo, headerLangState])
  const boundSuffix = useMemo(() => {
    if (currentLineIsMeijo) {
      return ''
    }
    switch (headerLangState) {
      case 'EN':
        return ''
      case 'ZH':
        return ''
      case 'KO':
        return getIsLoopLine(currentLine, trainType) ? '방면' : '행'
      default:
        return getIsLoopLine(currentLine, trainType) ? '方面' : 'ゆき'
    }
  }, [currentLine, currentLineIsMeijo, headerLangState, trainType])

  if (!station) {
    return null
  }

  return (
    <View>
      <LinearGradient
        colors={['#222222', '#212121']}
        style={styles.gradientRoot}
      >
        <VisitorsPanel />
        <View style={styles.left}>
          <View style={styles.boundContainer}>
            {boundPrefix !== '' && selectedBound && (
              <Typography style={styles.boundGrayText}>
                {boundPrefix}
              </Typography>
            )}
            <Typography
              style={styles.bound}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {boundText}
            </Typography>
            {boundSuffix !== '' && selectedBound && (
              <Typography
                style={[
                  styles.boundSuffix,
                  headerLangState === 'KO' ? styles.boundGrayText : null,
                ]}
              >
                {boundSuffix}
              </Typography>
            )}
          </View>
        </View>
        <View
          style={{
            ...styles.colorBar,
            backgroundColor: currentLine
              ? prependHEX(currentLine.lineColorC ?? '#000')
              : '#aaa',
          }}
        />
        <View style={styles.right}>
          <Typography style={styles.state}>{stateText}</Typography>
          <View style={styles.stationNameContainer}>
            {lineMarkShape !== null &&
            lineMarkShape !== undefined &&
            lineColor &&
            currentStationNumber ? (
              <NumberingIcon
                shape={lineMarkShape}
                lineColor={numberingColor}
                stationNumber={currentStationNumber.stationNumber}
                threeLetterCode={threeLetterCode}
              />
            ) : null}
            <Typography
              style={styles.stationName}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {stationText}
            </Typography>
          </View>
        </View>
        <Clock white style={styles.clockOverride} />
      </LinearGradient>
    </View>
  )
}

export default HeaderYamanote
