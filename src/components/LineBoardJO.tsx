import React, { useCallback, useMemo } from 'react'
import {
  Dimensions,
  Platform,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
} from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilValue } from 'recoil'
import { Station, StationNumber } from '../../gen/proto/stationapi_pb'
import useIsPassing from '../hooks/useIsPassing'
import useStationNumberIndexFunc from '../hooks/useStationNumberIndexFunc'
import useTransferLinesFromStation from '../hooks/useTransferLinesFromStation'
import lineState from '../store/atoms/line'
import stationState from '../store/atoms/station'
import { currentLineSelector } from '../store/selectors/currentLine'
import { currentStationSelector } from '../store/selectors/currentStation'
import { isEnSelector } from '../store/selectors/isEn'
import getStationNameR from '../utils/getStationNameR'
import getIsPass from '../utils/isPass'
import isTablet from '../utils/isTablet'
import { getNumberingColor } from '../utils/numbering'
import { heightScale } from '../utils/scale'
import ChevronJO from './ChevronJO'
import JOCurrentArrowEdge from './JOCurrentArrowEdge'
import NumberingIcon from './NumberingIcon'
import PadLineMarks from './PadLineMarks'
import PassChevronTY from './PassChevronTY'
import Typography from './Typography'

interface Props {
  stations: Station[]
  lineColors: (string | null | undefined)[]
}

const { width: windowWidth, height: windowHeight } = Dimensions.get('window')
const barWidth = isTablet ? (windowWidth - 120) / 8 : (windowWidth - 96) / 7.835
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
  wrapper: {
    flex: 1,
    marginLeft: isTablet ? 48 : 32,
  },
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
  barDot: {
    position: 'absolute',
    bottom: barBottom + 16,
    width: 32,
    height: 32,
    zIndex: 1,
    borderRadius: 32,
  },
  barTerminal: {
    left: isTablet ? barWidth * 8 - 16 : barWidth * 8 - 10,
    bottom: barTerminalBottom,
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: isTablet ? 32 : 20,
    borderRightWidth: isTablet ? 32 : 20,
    borderBottomWidth: isTablet ? 32 : 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '90deg' }],
  },
  stationNameWrapper: {
    flexDirection: 'row',
    marginLeft: barWidth / 2.5,
    flex: 1,
  },
  stationNameContainer: {
    width: barWidth,
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
    paddingBottom: isTablet
      ? Platform.select({ ios: 48 * 0.25, android: 0 })
      : 24 * 0.25,
  },
  verticalStationName: {
    marginBottom: 0,
  },
  grayColor: {
    color: '#ccc',
  },
  lineDot: {
    height: isTablet ? 48 : 28,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -70 : 54,
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
  numberingIconContainer: {
    position: 'absolute',
    bottom: -155,
    left: -32,
    transform: [{ scale: 0.3 }],
  },
  padLineMarksContainer: {
    position: 'absolute',
    flex: 1,
    width: '100%',
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
  stations: Station[]
  station: Station
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
  stations: Station[]
  station: Station
  loopIndex: number
  hasNumberedStation: boolean
}

const StationNameCell: React.FC<StationNameCellProps> = ({
  stations,
  arrived,
  station: stationInLoop,
  loopIndex,
  hasNumberedStation,
}: StationNameCellProps) => {
  const isEn = useRecoilValue(isEnSelector)

  const transferLines = useTransferLinesFromStation(stationInLoop, {
    omitJR: true,
  })

  const isPass = useMemo(() => getIsPass(stationInLoop), [stationInLoop])

  const includesLongStationName = useMemo(
    () =>
      !!stations.filter((s) => s.name.includes('ー') || s.name.length > 6)
        .length,
    [stations]
  )

  const getStationNumberIndex = useStationNumberIndexFunc()
  const stationNumberIndex = getStationNumberIndex(stationInLoop)
  const numberingObj = useMemo<StationNumber | undefined>(
    () => stationInLoop.stationNumbers?.[stationNumberIndex],
    [stationInLoop.stationNumbers, stationNumberIndex]
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
      <View style={styles.numberingIconContainer}>
        {numberingObj && isTablet && hasNumberedStation ? (
          <NumberingIcon
            shape={numberingObj.lineSymbolShape}
            lineColor={numberingColor}
            stationNumber={numberingObj.stationNumber}
            allowScaling={false}
          />
        ) : null}
      </View>

      <View
        style={{
          ...styles.padLineMarksContainer,
          top: hasNumberedStation ? windowHeight - 7 : windowHeight - 45,
        }}
      >
        <PadLineMarks
          shouldGrayscale={isPass}
          transferLines={transferLines}
          station={stationInLoop}
        />
      </View>
    </View>
  )
}

const LineBoardJO: React.FC<Props> = ({ stations, lineColors }: Props) => {
  const { arrived } = useRecoilValue(stationState)
  const { selectedLine } = useRecoilValue(lineState)
  const isPassing = useIsPassing()
  const station = useRecoilValue(currentStationSelector({}))
  const currentLine = useRecoilValue(currentLineSelector)

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  )

  const currentStationIndex = stations.findIndex(
    (s) => s.groupId === station?.groupId
  )

  const stationNameCellForMap = useCallback(
    (s: Station, i: number): JSX.Element => {
      return (
        <StationNameCell
          key={s.groupId}
          station={s}
          stations={stations}
          arrived={!isPassing}
          loopIndex={i}
          hasNumberedStation={s.stationNumbers.length > 0}
        />
      )
    },
    [isPassing, stations]
  )

  const emptyArray = useMemo(
    () =>
      Array.from({
        length: 8 - lineColors.length,
      }).fill(lineColors[lineColors.length - 1]) as string[],
    [lineColors]
  )

  const getLeft = useCallback((index: number) => {
    if (isTablet) {
      return barWidth * (index + 1) - barWidth / 2
    }
    return barWidth * (index + 1) - barWidth * 0.6
  }, [])

  const getBottom = useCallback(
    (index: number) => {
      if (isTablet) {
        return index <= currentStationIndex ? barBottom + 24 : barBottom + 16
      }
      return index <= currentStationIndex ? barBottom + 12 : barBottom + 5
    },
    [currentStationIndex]
  )

  if (!line) {
    return null
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.root}>
        {[...lineColors, ...emptyArray].map((lc, i) => (
          <React.Fragment key={`${lc}${i.toString()}`}>
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
            <View
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
            {getIsPass(stations[i]) ? (
              <View
                style={{
                  ...styles.barDot,
                  left: getLeft(i),
                  bottom: getBottom(i),
                  width: i <= currentStationIndex ? 16 : 32,
                  height: i <= currentStationIndex ? 16 : 32,
                }}
              >
                <PassChevronTY />
              </View>
            ) : (
              <View
                style={{
                  ...styles.barDot,
                  backgroundColor:
                    stations.length <= i ? 'transparent' : 'white',
                  left: getLeft(i),
                  bottom: getBottom(i),
                  width: i <= currentStationIndex ? 16 : 32,
                  height: i <= currentStationIndex ? 16 : 32,
                }}
              />
            )}
          </React.Fragment>
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
    </View>
  )
}

export default React.memo(LineBoardJO)
