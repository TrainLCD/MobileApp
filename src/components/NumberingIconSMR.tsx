import React from 'react'
import { StyleSheet, View } from 'react-native'
import { NUMBERING_ICON_SIZE, NumberingIconSize } from '../constants/numbering'
import isTablet from '../utils/isTablet'
import Typography from './Typography'

type Props = {
  stationNumber: string
  size?: NumberingIconSize
}

const styles = StyleSheet.create({
  root: {
    borderWidth: isTablet ? 2 : 1,
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: isTablet ? 72 * 1.5 : 72,
  },
  rootTiny: {
    width: 20,
    height: 20,
    borderRadius: 16.8,
    borderWidth: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rootTinySymbol: {
    fontSize: isTablet ? 4 * 1.5 : 4,
  },
  rootMedium: {
    width: isTablet ? 35 * 1.5 : 35,
    height: isTablet ? 35 * 1.5 : 35,
    borderRadius: isTablet ? 35 * 1.5 : 35,
    borderWidth: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediumLineSymbol: {
    fontSize: isTablet ? 12 * 1.5 : 12,
  },
  lineSymbol: {
    position: 'absolute',
    bottom: isTablet ? 15 : 10,
    alignSelf: 'center',
    fontSize: isTablet ? 18 * 1.5 : 18,
    lineHeight: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
  },
  stationNumber: {
    position: 'absolute',
    top: isTablet ? 15 : 10,
    alignSelf: 'center',
    fontSize: isTablet ? 18 * 1.5 : 18,
    lineHeight: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
  },
  divider: {
    top: isTablet ? (72 * 1.5) / 2 - 6 : 72 / 2 - 2,
    position: 'absolute',
    height: isTablet ? 2 : 1,
    left: isTablet ? -2 : -1,
    width: isTablet ? 72 * 1.5 : 72,
    backgroundColor: 'black',
  },
})

const NumberingIconSMR: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  size,
}: Props) => {
  const lineSymbol = stationNumberRaw.split('-')[0]
  const stationNumber = stationNumberRaw.split('-')[1]

  if (size === NUMBERING_ICON_SIZE.TINY) {
    return (
      <View style={styles.rootTiny}>
        <Typography style={styles.rootTinySymbol}>SMR</Typography>
      </View>
    )
  }

  if (size === NUMBERING_ICON_SIZE.MEDIUM) {
    return (
      <View style={styles.rootMedium}>
        <Typography style={styles.mediumLineSymbol}>{lineSymbol}</Typography>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <Typography style={styles.stationNumber}>{stationNumber}</Typography>
      <View style={styles.divider} />
      <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
    </View>
  )
}

export default NumberingIconSMR
