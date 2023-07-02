/* eslint-disable react-native/no-unused-styles */
import React, { useMemo } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { NUMBERING_ICON_SIZE } from '../constants/numbering'
import { Line, Station } from '../gen/stationapi_pb'
import useIsEn from '../hooks/useIsEn'
import { LineMark } from '../models/LineMark'
import { APP_THEME, AppTheme } from '../models/Theme'
import isDifferentStationName from '../utils/differentStationName'
import isSmallTablet from '../utils/isSmallTablet'
import isTablet from '../utils/isTablet'
import TransferLineDot from './TransferLineDot'
import TransferLineMark from './TransferLineMark'
import Typography from './Typography'

type Props = {
  shouldGrayscale: boolean
  lineMarks: (LineMark | null)[]
  transferLines: Line.AsObject[]
  station: Station.AsObject
  theme?: AppTheme
}

const windowWidth = Dimensions.get('window').width

const stylesNormal = StyleSheet.create({
  root: {
    marginTop: 4,
  },
  lineMarkWrapper: {
    marginTop: 4,
    width: windowWidth / 10,
    flexDirection: 'row',
  },
  lineNameWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  lineName: {
    fontWeight: 'bold',
    fontSize: RFValue(7),
  },
  // JR西日本テーマのときだけ必要なので他のテーマでは空のスタイルにする
  topBar: {},
})

const stylesWest = StyleSheet.create({
  root: {
    marginTop: 16,
  },
  topBar: {
    width: 8,
    height: 16,
    backgroundColor: '#212121',
    alignSelf: 'center',
    marginTop: 6,
  },
  lineMarkWrapper: {
    marginTop: 4,
    width: windowWidth / 10,
    flexDirection: 'row',
  },
  lineNameWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  lineName: {
    fontWeight: 'bold',
    fontSize: RFValue(7),
  },
})

const PadLineMarks: React.FC<Props> = ({
  shouldGrayscale,
  lineMarks,
  transferLines,
  station,
  theme,
}) => {
  const isEn = useIsEn()
  const styles = useMemo(
    () => (theme === APP_THEME.JR_WEST ? stylesWest : stylesNormal),
    [theme]
  )

  if (!isTablet || isSmallTablet) {
    return <></>
  }

  return (
    <View style={styles.root}>
      {!!lineMarks.length && theme === APP_THEME.JR_WEST && (
        <View style={styles.topBar} />
      )}

      {lineMarks.map((lm, i) =>
        lm ? (
          <View style={styles.lineMarkWrapper} key={transferLines[i]?.id}>
            <TransferLineMark
              line={transferLines[i]}
              mark={lm}
              size={NUMBERING_ICON_SIZE.TINY}
              shouldGrayscale={shouldGrayscale}
            />
            <View style={styles.lineNameWrapper}>
              <Typography
                style={{
                  ...styles.lineName,
                  color: shouldGrayscale ? '#ccc' : 'black',
                }}
              >
                {`${
                  isEn
                    ? transferLines[i]?.nameRoman
                    : transferLines[i]?.nameShort
                }${
                  isDifferentStationName(station, transferLines[i])
                    ? `\n[ ${
                        isEn
                          ? transferLines[i]?.station?.nameRoman
                          : transferLines[i]?.station?.name
                      } ]`
                    : ''
                }`}
              </Typography>
            </View>
          </View>
        ) : (
          <View style={styles.lineMarkWrapper} key={transferLines[i]?.id}>
            <TransferLineDot
              key={transferLines[i]?.id}
              line={transferLines[i]}
              small
              shouldGrayscale={shouldGrayscale}
            />
            <Typography
              style={{
                ...styles.lineName,
                color: shouldGrayscale ? '#ccc' : 'black',
              }}
            >
              {isEn ? transferLines[i]?.nameRoman : transferLines[i]?.nameShort}
            </Typography>
          </View>
        )
      )}
    </View>
  )
}

export default PadLineMarks
