import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import FONTS from '../constants/fonts'
import { NUMBERING_ICON_SIZE, NumberingIconSize } from '../constants/numbering'
import isTablet from '../utils/isTablet'

type Props = {
  stationNumber: string
  lineColor: string
  size?: NumberingIconSize
}

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: isTablet ? 8 * 1.5 : 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbol: {
    color: '#221714',
    fontSize: isTablet ? 24 * 1.5 : 24,
    lineHeight: isTablet ? 24 * 1.5 : 24,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  lineSymbolLong: {
    color: '#221714',
    fontSize: isTablet ? 20 * 1.5 : 20,
    lineHeight: isTablet ? 20 * 1.5 : 20,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  rootTiny: {
    width: 20,
    height: 20,
    borderRadius: 25.6 / 2,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  rootSmall: {
    width: 38,
    height: 38,
    borderRadius: 38 / 2,
    borderWidth: isTablet ? 6 : 3,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  rootMedium: {
    width: isTablet ? 35 * 1.5 : 35,
    height: isTablet ? 35 * 1.5 : 35,
    borderRadius: (isTablet ? 35 * 1.5 : 35) / 2,
    borderWidth: isTablet ? 10 : 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  lineSymbolTiny: {
    color: '#221714',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 1,
  },
  lineSymbolTinyLong: {
    color: '#221714',
    fontSize: 5,
    lineHeight: 5,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 1,
  },
  lineSymbolSmall: {
    color: '#221714',
    fontSize: 18,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 2,
  },
  lineSymbolMedium: {
    color: '#221714',
    fontSize: isTablet ? 24 : 14,
    lineHeight: isTablet ? 24 : 14,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 2,
  },
  lineSymbolMediumLong: {
    color: '#221714',
    fontSize: isTablet ? 16 : 11,
    lineHeight: isTablet ? 16 : 11,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 2,
    alignSelf: 'center',
  },
  lineSymbolSmallLong: {
    color: '#221714',
    fontSize: 12,
    lineHeight: 12,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
  },
  stationNumber: {
    color: '#221714',
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

const NumberingIconRound: React.FC<Props> = ({
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

  if (size === NUMBERING_ICON_SIZE.TINY) {
    return (
      <View style={[styles.rootTiny, { borderColor: lineColor }]}>
        <Text
          style={
            lineSymbol.length === 2
              ? styles.lineSymbolTinyLong
              : styles.lineSymbolTiny
          }
        >
          {lineSymbol}
        </Text>
      </View>
    )
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={[styles.rootMedium, { borderColor: lineColor }]}>
        <Text
          style={
            lineSymbol.length === 2
              ? styles.lineSymbolMediumLong
              : styles.lineSymbolMedium
          }
        >
          {lineSymbol}
        </Text>
      </View>
    )
  }

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootSmall, { borderColor: lineColor }]}>
        <Text
          style={
            lineSymbol.length === 2
              ? styles.lineSymbolSmallLong
              : styles.lineSymbolSmall
          }
        >
          {lineSymbol}
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <Text
        style={
          lineSymbol.length === 2 ? styles.lineSymbolLong : styles.lineSymbol
        }
      >
        {lineSymbol}
      </Text>
      {stationNumber ? (
        <Text style={stationNumberTextStyles}>{stationNumber}</Text>
      ) : null}
    </View>
  )
}

NumberingIconRound.defaultProps = {
  size: NUMBERING_ICON_SIZE.DEFAULT,
}

export default NumberingIconRound
