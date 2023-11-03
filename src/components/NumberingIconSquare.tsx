import React from 'react'
import { StyleSheet, View } from 'react-native'
import { withAnchorPoint } from 'react-native-anchor-point'
import isTablet from '../utils/isTablet'
import Typography from './Typography'
import { FONTS, NUMBERING_ICON_SIZE, NumberingIconSize } from '../constants'

type Props = {
  stationNumber: string
  lineColor: string
  threeLetterCode?: string
  allowScaling: boolean
  size?: NumberingIconSize
}

const styles = StyleSheet.create({
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 12 : 8,
    borderWidth: isTablet ? 7 * 1.5 : 7,
    backgroundColor: 'white',
  },
  tlcContainer: {
    backgroundColor: '#231e1f',
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: isTablet ? 16 : 14,
    paddingVertical: isTablet ? 8 : 4,
    paddingHorizontal: isTablet ? 8 : 4,
  },
  tlcText: {
    color: 'white',
    textAlign: 'center',
    lineHeight: isTablet ? 24 * 1.5 : 24,
    fontSize: isTablet ? 24 * 1.5 : 24,
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
  rootSmall: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 4,
    borderWidth: 3,
    borderColor: 'white',
  },
  lineSymbolSmall: {
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 2,
    color: '#231e1f',
  },
  lineSymbol: {
    lineHeight: isTablet ? 24 * 1.5 : 24,
    fontSize: isTablet ? 24 * 1.5 : 24,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 4,
  },
  stationNumber: {
    lineHeight: isTablet ? 32 * 1.5 : 32,
    fontSize: isTablet ? 32 * 1.5 : 32,
    marginTop: -4,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
  },
})

type CommonCompProps = {
  lineColor: string
  threeLetterCode: string | undefined
  lineSymbol: string
  stationNumber: string
  size?: NumberingIconSize
}

const Common = ({
  lineColor,
  lineSymbol,
  stationNumber,
  size,
}: CommonCompProps) => {
  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootSmall, { borderColor: lineColor }]}>
        <Typography style={styles.lineSymbolSmall}>{lineSymbol}</Typography>
      </View>
    )
  }
  return (
    <View style={[styles.root, { borderColor: lineColor }]}>
      <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
      <Typography style={styles.stationNumber}>{stationNumber}</Typography>
    </View>
  )
}

const NumberingIconSquare: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  threeLetterCode,
  allowScaling,
  size,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-')
  const stationNumber = stationNumberRest.join('')

  if (threeLetterCode) {
    return (
      <View
        style={[
          styles.tlcContainer,
          withAnchorPoint(
            { transform: [{ scale: 0.7 }] },
            { x: 0, y: 1.2 },
            {
              width: isTablet ? 72 * 1.5 : 72,
              height: isTablet ? 72 * 1.5 : 72,
            }
          ),
        ]}
      >
        <Typography style={styles.tlcText}>{threeLetterCode}</Typography>
        <Common
          lineColor={lineColor}
          threeLetterCode={threeLetterCode}
          lineSymbol={lineSymbol}
          stationNumber={stationNumber}
        />
      </View>
    )
  }

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <Common
        lineColor={lineColor}
        threeLetterCode={threeLetterCode}
        lineSymbol={lineSymbol}
        stationNumber={stationNumber}
        size={size}
      />
    )
  }

  return (
    <View
      style={[
        allowScaling &&
          withAnchorPoint(
            { transform: [{ scale: 0.8 }] },
            { x: 0, y: 1.2 },
            {
              width: isTablet ? 72 * 1.5 : 72,
              height: isTablet ? 72 * 1.5 : 72,
            }
          ),
      ]}
    >
      <Common
        lineColor={lineColor}
        threeLetterCode={threeLetterCode}
        lineSymbol={lineSymbol}
        stationNumber={stationNumber}
      />
    </View>
  )
}

export default NumberingIconSquare
