import React from 'react'
import { StyleSheet, View } from 'react-native'
import isTablet from '../utils/isTablet'
import Typography from './Typography'

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    borderRadius: (isTablet ? 72 * 1.5 : 72) / 2,
    borderWidth: isTablet ? 6 * 1.5 : 6,
    borderColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  stationNumber: {
    color: 'black',
    fontSize: isTablet ? 35 * 1.5 : 35,
    textAlign: 'center',
    fontWeight: 'bold',
  },
})

type Props = {
  stationNumber: string
}

const NumberingIconMonochromeRound: React.FC<Props> = ({ stationNumber }) => {
  return (
    <View style={styles.root}>
      <Typography style={styles.stationNumber}>{stationNumber}</Typography>
    </View>
  )
}

export default NumberingIconMonochromeRound
