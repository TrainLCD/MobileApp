import React, { useCallback, useMemo } from 'react'
import {
  Dimensions,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
} from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilValue } from 'recoil'
import { NUMBERING_ICON_SIZE } from '../constants/numbering'
import { parenthesisRegexp } from '../constants/regexp'
import { Station, StationNumber } from '../gen/stationapi_pb'
import { useCurrentLine } from '../hooks/useCurrentLine'
import useCurrentStation from '../hooks/useCurrentStation'
import useIsEn from '../hooks/useIsEn'
import useIsPassing from '../hooks/useIsPassing'
import useStationNumberIndexFunc from '../hooks/useStationNumberIndexFunc'
import useTransferLinesFromStation from '../hooks/useTransferLinesFromStation'
import lineState from '../store/atoms/line'
import stationState from '../store/atoms/station'
import getStationNameR from '../utils/getStationNameR'
import getIsPass from '../utils/isPass'
import isTablet from '../utils/isTablet'
import omitJRLinesIfThresholdExceeded from '../utils/jr'
import { getNumberingColor } from '../utils/numbering'
import { heightScale } from '../utils/scale'
import ChevronJO from './ChevronJO'
import JOCurrentArrowEdge from './JOCurrentArrowEdge'
import NumberingIcon from './NumberingIcon'
import PadLineMarks from './PadLineMarks'
import PassChevronTY from './PassChevronTY'
import Typography from './Typography'

interface Props {
  stations: Station.AsObject[]
  lineColors: (string | null | undefined)[]
}

const { width: windowWidth, height: windowHeight } = Dimensions.get('window')
const barWidth = isTablet ? (windowWidth - 72) / 8 : (windowWidth - 48) / 8

const barBottom = ((): number => {
  if (isTablet) {
    return 32
  }
  return 48
})()

const barTerminalBottom = ((): number => {
  if (isTablet) {
    return 48
  }
  return 58
})()

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: windowHeight,
    bottom: isTablet ? windowHeight / 2.5 : undefined,
  },
  stoppingChevron: {
    position: 'absolute',
    bottom: barBottom,
  },
  chevron: {
    position: 'absolute',
    bottom: barBottom,
  },
  bar: {
    position: 'absolute',
    bottom: barBottom,
    width: barWidth,
    height: isTablet ? 64 : 40,
  },
  barTerminal: {
    right: isTablet ? 24 : 18,
    bottom: barTerminalBottom,
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: isTablet ? 32 : 20,
    borderRightWidth: isTablet ? 32 : 20,
    borderBottomWidth: isTablet ? 32 : 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '90deg' }],
    borderWidth: 0,
  },
  stationNameWrapper: {
    flexDirection: 'row',
    justifyContent: isTablet ? 'space-between' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  stationNameContainer: {
    width: windowWidth / 9,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 110 : undefined,
    paddingBottom: isTablet ? undefined : 96,
  },
  stationName: {
    width: isTablet ? 48 : 32,
    textAlign: 'center',
    fontSize: RFValue(18),
    fontWeight: 'bold',
  },
  stationNameEn: {
    fontSize: RFValue(18),
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: -30,
    paddingBottom: isTablet ? 48 * 0.25 : 24 * 0.25,
  },
  verticalStationName: {
    marginBottom: 8,
  },
  grayColor: {
    color: '#ccc',
  },
  lineDot: {
    width: isTablet ? 48 : 28,
    height: isTablet ? 48 : 28,
    position: 'absolute',
    zIndex: 9999,
    backgroundColor: '#fff',
    bottom: isTablet ? -70 : 54,
    overflow: 'visible',
    borderRadius: 24,
  },
  arrivedLineDot: {
    width: isTablet ? 48 : 28,
    height: isTablet ? 48 : 28,
    borderRadius: 22,
    position: 'absolute',
    left: 2,
    top: 2,
  },
  passChevron: {
    width: isTablet ? 48 : 28,
    height: isTablet ? 48 : 28,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -70 : 54,
  },
  marksContainer: {
    marginTop: 32,
  },
  numberingIconContainer: {
    width: (isTablet ? 72 * 1.5 : 72) / 2,
    height: (isTablet ? 72 * 1.5 : 72) / 2,
    transform: [{ scale: 0.3 }],
    marginTop: 12,
    marginLeft: -8,
  },
  passNumberingContainer: {
    width: (isTablet ? 72 * 1.5 : 72) / 2,
    height: (isTablet ? 72 * 1.5 : 72) / 2,
    transform: [{ scale: 0.3 }],
    marginTop: -4,
    marginLeft: -8,
  },
})

const getStationNameEnExtraStyle = (isLast: boolean): StyleProp<TextStyle> => {
  if (!isTablet) {
    return {
      width: heightScale(300),
      marginBottom: 58,
    }
  }
  if (isLast) {
    return {
      width: 200,
      marginBottom: 70,
    }
  }
  return {
    width: 250,
    marginBottom: 84,
  }
}
interface StationNameProps {
  stations: Station.AsObject[]
  station: Station.AsObject
  en?: boolean
  horizontal?: boolean
  passed?: boolean
  index: number
}

const StationName: React.FC<StationNameProps> = ({
  stations,
  station,
  en,
  horizontal,
  passed,
  index,
}: StationNameProps) => {
  const stationNameR = getStationNameR(station)

  if (en) {
    return (
      <Typography
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(index === stations.length - 1),
          passed ? styles.grayColor : null,
        ]}
      >
        {stationNameR}
      </Typography>
    )
  }
  if (horizontal) {
    return (
      <Typography
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(index === stations.length - 1),
          passed ? styles.grayColor : null,
        ]}
      >
        {station.name}
      </Typography>
    )
  }
  return (
    <View style={styles.verticalStationName}>
      {station.name.split('').map((c, j) => (
        <Typography
          style={[styles.stationName, passed ? styles.grayColor : null]}
          key={`${j + 1}${c}`}
        >
          {c}
        </Typography>
      ))}
    </View>
  )
}

interface StationNameCellProps {
  arrived: boolean
  stations: Station.AsObject[]
  station: Station.AsObject
  loopIndex: number
  currentIndex: number
}

const StationNameCell: React.FC<StationNameCellProps> = ({
  stations,
  arrived,
  station: stationInLoop,
  currentIndex,
  loopIndex,
}: StationNameCellProps) => {
  const transferLines = useTransferLinesFromStation(stationInLoop)

  const omittedTransferLines = useMemo(
    () =>
      omitJRLinesIfThresholdExceeded(transferLines).map((l) => ({
        ...l,
        nameShort: l.nameShort.replace(parenthesisRegexp, ''),
        nameRoman: l.nameRoman.replace(parenthesisRegexp, ''),
      })),
    [transferLines]
  )

  const isEn = useIsEn()

  const includesLongStationName = useMemo(
    () =>
      !!stations.filter((s) => s.name.includes('ー') || s.name.length > 6)
        .length,
    [stations]
  )

  const isPass = useMemo(() => getIsPass(stationInLoop), [stationInLoop])

  const getStationNumberIndex = useStationNumberIndexFunc()
  const stationNumberIndex = getStationNumberIndex(stationInLoop)
  const numberingObj = useMemo<StationNumber.AsObject | undefined>(
    () => stationInLoop.stationNumbersList?.[stationNumberIndex],
    [stationInLoop.stationNumbersList, stationNumberIndex]
  )

  const numberingColor = useMemo(
    () =>
      getNumberingColor(
        arrived,
        numberingObj,
        stationInLoop,
        stationInLoop.line
      ),
    [arrived, numberingObj, stationInLoop]
  )
  return (
    <View key={stationInLoop.name} style={styles.stationNameContainer}>
      <StationName
        stations={stations}
        station={stationInLoop}
        en={isEn}
        horizontal={includesLongStationName}
        passed={isPass}
        index={loopIndex}
      />
      {!isPass ? (
        <View style={styles.lineDot}>
          {arrived && currentIndex === loopIndex ? (
            <View style={styles.arrivedLineDot} />
          ) : null}
          <View style={styles.marksContainer}>
            <View style={styles.numberingIconContainer}>
              {numberingObj && isTablet ? (
                <NumberingIcon
                  shape={numberingObj.lineSymbolShape}
                  lineColor={numberingColor}
                  stationNumber={numberingObj.stationNumber}
                  size={NUMBERING_ICON_SIZE.SMALL}
                  allowScaling={false}
                />
              ) : null}
            </View>

            <PadLineMarks
              shouldGrayscale={isPass}
              transferLines={omittedTransferLines}
              station={stationInLoop}
            />
          </View>
        </View>
      ) : (
        <View style={styles.passChevron}>
          <PassChevronTY />

          {numberingObj && isTablet ? (
            <View style={styles.passNumberingContainer}>
              <NumberingIcon
                shape={numberingObj.lineSymbolShape}
                lineColor={numberingColor}
                stationNumber={numberingObj.stationNumber}
                size={NUMBERING_ICON_SIZE.SMALL}
                allowScaling={false}
                shouldGrayscale
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  )
}

const LineBoardJO: React.FC<Props> = ({ stations, lineColors }: Props) => {
  const { arrived } = useRecoilValue(stationState)
  const { selectedLine } = useRecoilValue(lineState)
  const isPassing = useIsPassing()
  const currentStation = useCurrentStation()
  const currentLine = useCurrentLine()

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  )

  const currentStationIndex = stations.findIndex(
    (s) => s.groupId === currentStation?.groupId
  )

  const stationNameCellForMap = useCallback(
    (s: Station.AsObject, i: number): JSX.Element => (
      <StationNameCell
        key={s.groupId}
        station={s}
        stations={stations}
        arrived={!isPassing}
        loopIndex={i}
        currentIndex={currentStationIndex}
      />
    ),
    [currentStationIndex, isPassing, stations]
  )

  const emptyArray = useMemo(
    () =>
      Array.from({
        length: 8 - lineColors.length,
      }).fill(lineColors[lineColors.length - 1]) as string[],
    [lineColors]
  )

  if (!line) {
    return null
  }

  return (
    <View style={styles.root}>
      {[...lineColors, ...emptyArray].map((lc, i) => (
        <View
          key={`${lc}${i.toString()}`}
          style={{
            ...styles.bar,
            left: barWidth * i,
            backgroundColor: (() => {
              if (i <= currentStationIndex) {
                if (!arrived) {
                  return '#888'
                }
                if (i === currentStationIndex) {
                  return '#dc143c'
                }
                return '#888'
              }

              return lc ?? '#888'
            })(),
          }}
        />
      ))}

      {arrived ? (
        <View
          style={[
            styles.stoppingChevron,
            { left: barWidth * (currentStationIndex + 1) },
          ]}
        >
          <JOCurrentArrowEdge
            width={isTablet ? 24 : 15}
            height={isTablet ? 64 : 40}
          />
        </View>
      ) : (
        <View
          style={[
            styles.chevron,
            { left: barWidth * (currentStationIndex + 1) - 32 },
          ]}
        >
          <ChevronJO width={isTablet ? 60 : 50} height={isTablet ? 65 : 40} />
        </View>
      )}

      <View
        style={{
          ...styles.barTerminal,
          borderBottomColor: line.color
            ? lineColors[lineColors.length - 1] || line.color
            : '#000',
        }}
      />
      <View style={styles.stationNameWrapper}>
        {stations.map(stationNameCellForMap)}
      </View>
    </View>
  )
}

export default React.memo(LineBoardJO)
