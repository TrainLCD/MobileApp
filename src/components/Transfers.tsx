import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRecoilValue } from 'recoil'
import { NUMBERING_ICON_SIZE } from '../constants/numbering'
import { parenthesisRegexp } from '../constants/regexp'
import useCurrentStation from '../hooks/useCurrentStation'
import useGetLineMark from '../hooks/useGetLineMark'
import useNextStation from '../hooks/useNextStation'
import useStationNumberIndexFunc from '../hooks/useStationNumberIndexFunc'
import useTransferLines from '../hooks/useTransferLines'
import { StationNumber } from '../models/StationAPI'
import { APP_THEME, AppTheme } from '../models/Theme'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import prependHEX from '../utils/prependHEX'
import Heading from './Heading'
import NumberingIcon from './NumberingIcon'
import TransferLineDot from './TransferLineDot'
import TransferLineMark from './TransferLineMark'

interface Props {
  onPress: () => void
  theme: AppTheme
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    paddingBottom: isTablet ? 128 : 84,
  },
  transferLine: {
    flexDirection: 'row',
    marginBottom: isTablet ? 16 : 8,
  },
  transferList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: isTablet ? 32 : 24,
  },
  transferLineInnerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flexBasis: '50%',
    paddingLeft: isTablet ? '15%' : '5%',
  },
  transferLineInnerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    flexBasis: '50%',
  },
  lineNameContainer: {
    marginLeft: isTablet ? 4 : 2,
  },
  lineName: {
    fontSize: RFValue(18),
    color: '#333',
    fontWeight: 'bold',
  },
  lineNameEn: {
    fontSize: RFValue(12),
    color: '#333',
    fontWeight: 'bold',
  },
  headingContainerMetro: {
    height: RFValue(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headingContainerSaikyo: {
    marginTop: 24,
    width: '75%',
    alignSelf: 'center',
  },
  numberingIconContainer: {
    width: (isTablet ? 72 * 1.5 : 72) / 1.25,
    height: (isTablet ? 72 * 1.5 : 72) / 1.25,
    transform: [{ scale: 0.5 }],
  },
})

const Transfers: React.FC<Props> = ({ onPress, theme }: Props) => {
  const { arrived } = useRecoilValue(stationState)

  const { left: safeAreaLeft } = useSafeAreaInsets()

  const lines = useTransferLines()
  const currentStation = useCurrentStation()
  const nextStation = useNextStation()

  const getLineMarkFunc = useGetLineMark()
  const getStationNumberIndex = useStationNumberIndexFunc()

  const station = useMemo(
    () => (arrived ? currentStation : nextStation),
    [arrived, currentStation, nextStation]
  )

  const stationNumbers = useMemo(
    () =>
      lines?.map<StationNumber>((l) => ({
        lineSymbol:
          l.transferStation?.stationNumbers.find((sn) =>
            l.lineSymbols.some((sym) => sym.lineSymbol === sn.lineSymbol)
          )?.lineSymbol ?? '',
        lineSymbolColor:
          l.transferStation?.stationNumbers.find((sn) =>
            l.lineSymbols.some((sym) => sym.lineSymbol === sn.lineSymbol)
          )?.lineSymbolColor ?? '',
        stationNumber:
          l.transferStation?.stationNumbers.find((sn) =>
            l.lineSymbols.some((sym) => sym.lineSymbol === sn.lineSymbol)
          )?.stationNumber ?? '',
        lineSymbolShape:
          l.transferStation?.stationNumbers.find((sn) =>
            l.lineSymbols.some((sym) => sym.lineSymbol === sn.lineSymbol)
          )?.lineSymbolShape ?? 'NOOP',
      })) ?? [],
    [lines]
  )

  const renderTransferLines = useCallback(
    (): (JSX.Element | null)[] =>
      lines.map((line, index) => {
        if (!station) {
          return null
        }
        const numberingIndex = getStationNumberIndex(station.stationNumbers)

        const lineMark = getLineMarkFunc({ station, line, numberingIndex })
        const includesNumberedStation = stationNumbers.some(
          (sn) => !!sn?.stationNumber
        )
        const signShape =
          lineMark?.currentLineMark?.signShape ?? lineMark?.signShape

        return (
          <View style={styles.transferLine} key={line.id}>
            <View style={styles.transferLineInnerLeft}>
              {lineMark ? (
                <TransferLineMark
                  line={line}
                  mark={lineMark}
                  size={NUMBERING_ICON_SIZE.MEDIUM}
                />
              ) : (
                <TransferLineDot line={line} />
              )}
              <View style={styles.lineNameContainer}>
                <Text style={styles.lineName}>
                  {line.name.replace(parenthesisRegexp, '')}
                </Text>
                <Text style={styles.lineNameEn}>
                  {line.nameR.replace(parenthesisRegexp, '')}
                </Text>
                {!!line.nameZh?.length && !!line.nameKo?.length ? (
                  <Text style={styles.lineNameEn}>
                    {`${line.nameZh.replace(
                      parenthesisRegexp,
                      ''
                    )} / ${line.nameKo.replace(parenthesisRegexp, '')}`}
                  </Text>
                ) : null}
              </View>
            </View>
            {includesNumberedStation ? (
              <View style={styles.transferLineInnerRight}>
                {signShape ? (
                  <View style={styles.numberingIconContainer}>
                    <NumberingIcon
                      shape={signShape}
                      lineColor={prependHEX(
                        stationNumbers[index]?.lineSymbolColor
                      )}
                      stationNumber={stationNumbers[index]?.stationNumber ?? ''}
                      allowScaling={false}
                    />
                  </View>
                ) : (
                  <View style={styles.numberingIconContainer} />
                )}
                {line.transferStation && (
                  <View>
                    <Text style={styles.lineName}>
                      {`${line.transferStation?.name.replace(
                        parenthesisRegexp,
                        ''
                      )}駅`}
                    </Text>
                    <Text style={styles.lineNameEn}>
                      {`${line.transferStation?.nameR.replace(
                        parenthesisRegexp,
                        ''
                      )} Sta.`}
                    </Text>
                    <Text style={styles.lineNameEn}>
                      {`${line.transferStation?.nameZh.replace(
                        parenthesisRegexp,
                        ''
                      )}站 / ${line.transferStation?.nameKo.replace(
                        parenthesisRegexp,
                        ''
                      )}역`}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        )
      }),
    [getLineMarkFunc, getStationNumberIndex, lines, station, stationNumbers]
  )

  const CustomHeading = () => {
    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.TY:
      case APP_THEME.TOEI:
        return (
          <LinearGradient
            colors={['#fcfcfc', '#f5f5f5', '#ddd']}
            locations={[0, 0.95, 1]}
            style={styles.headingContainerMetro}
          >
            <Heading>{translate('transfer')}</Heading>
          </LinearGradient>
        )
      case APP_THEME.SAIKYO:
        return (
          <LinearGradient
            colors={['white', '#ccc', '#ccc', 'white']}
            start={[0, 1]}
            end={[1, 0]}
            locations={[0, 0.1, 0.9, 1]}
            style={styles.headingContainerSaikyo}
          >
            <Heading style={{ color: '#212121', fontWeight: '600' }}>
              {translate('transfer')}
            </Heading>
          </LinearGradient>
        )
      default:
        return (
          <Heading style={{ marginTop: 24 }}>{translate('transfer')}</Heading>
        )
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      <Pressable
        onPress={onPress}
        style={{
          flex: 1,
        }}
      >
        <CustomHeading />
        <View style={{ ...styles.transferList, marginLeft: safeAreaLeft }}>
          {renderTransferLines()}
        </View>
      </Pressable>
    </ScrollView>
  )
}

export default Transfers
