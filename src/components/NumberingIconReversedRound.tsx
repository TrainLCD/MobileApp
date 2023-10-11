import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import FONTS from '../constants/fonts'
import { NUMBERING_ICON_SIZE, NumberingIconSize } from '../constants/numbering'
import isTablet from '../utils/isTablet'
import Typography from './Typography'

type Props = {
  stationNumber: string
  lineColor: string
  size?: NumberingIconSize
}

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 24 * 1.5 : 24,
    lineHeight: isTablet ? 24 * 1.5 : 24,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  lineSymbolLong: {
    color: 'white',
    fontSize: isTablet ? 20 * 1.5 : 20,
    lineHeight: isTablet ? 20 * 1.5 : 20,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 25.6 / 2,
    borderWidth: 1,
    borderColor: 'white',
  },
  rootMedium: {
    width: isTablet ? 35 * 1.5 : 35,
    height: isTablet ? 35 * 1.5 : 35,
    borderRadius: (isTablet ? 35 * 1.5 : 35) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbolTiny: {
    color: 'white',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 1,
  },
  lineSymbolTinyLong: {
    color: 'white',
    fontSize: 5,
    lineHeight: 5,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 1,
  },
  lineSymbolMedium: {
    color: 'white',
    fontSize: isTablet ? 24 : 14,
    lineHeight: isTablet ? 24 : 14,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 2,
  },
  lineSymbolMediumLong: {
    color: 'white',
    fontSize: isTablet ? 16 : 11,
    lineHeight: isTablet ? 16 : 11,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 2,
    alignSelf: 'center',
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? 26 * 1.5 : 26,
    lineHeight: isTablet ? 26 * 1.5 : 26,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: isTablet ? -4 : -2,
  },
  longStationNumberAdditional: {
    fontSize: isTablet ? 20 * 1.5 : 20,
    letterSpacing: -2,
  },
})

const NumberingIconReversedRound: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-')
  const stationNumber = stationNumberRest.join('-')
  const isIncludesSubNumber = stationNumber.includes('-')
  const stationNumberTextStyles = useMemo(() => {
    if (isIncludesSubNumber) {
      return [styles.stationNumber, styles.longStationNumberAdditional]
    }
    return styles.stationNumber
  }, [isIncludesSubNumber])

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { backgroundColor: lineColor }]}>
        <Typography
          style={
            lineSymbol.length === 2
              ? styles.lineSymbolTinyLong
              : styles.lineSymbolTiny
          }
        >
          {lineSymbol}
        </Typography>
      </View>
    )
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={[styles.rootMedium, { backgroundColor: lineColor }]}>
        <Typography style={styles.lineSymbolMedium}>{lineSymbol}</Typography>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: lineColor }]}>
      <Typography
        style={
          lineSymbol.length === 2 ? styles.lineSymbolLong : styles.lineSymbol
        }
      >
        {lineSymbol}
      </Typography>
      {stationNumber ? (
        <Typography style={stationNumberTextStyles}>{stationNumber}</Typography>
      ) : null}
    </View>
  )
}

export default NumberingIconReversedRound
