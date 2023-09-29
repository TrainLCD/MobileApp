import React from 'react'
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
    borderRadius: isTablet ? 72 * 1.5 : 72,
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
    backgroundColor: 'white',
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16.8,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbolTiny: {
    color: 'white',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 2,
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? 24 * 1.5 : 24,
    lineHeight: isTablet ? 24 * 1.5 : 24,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
    marginTop: isTablet ? 4 : 2,
  },
})

const NumberingIconReversedRoundHorizontal: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-')
  const stationNumber = stationNumberRest.join('')

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { backgroundColor: lineColor }]}>
        <Typography style={styles.lineSymbolTiny}>{lineSymbol}</Typography>
      </View>
    )
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={[styles.rootMedium, { backgroundColor: lineColor }]}>
        <Typography style={styles.stationNumber}>{lineSymbol}</Typography>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: lineColor }]}>
      <Typography style={styles.stationNumber}>
        {lineSymbol}
        {stationNumber}
      </Typography>
    </View>
  )
}

export default NumberingIconReversedRoundHorizontal
