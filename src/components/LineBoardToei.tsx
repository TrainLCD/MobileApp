import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useMemo, useState } from 'react'
import { Dimensions, Platform, StyleSheet, View } from 'react-native'
import { useRecoilValue } from 'recoil'
import { Line, Station, StationNumber } from '../../gen/proto/stationapi_pb'
import { useCurrentLine } from '../hooks/useCurrentLine'
import { useInterval } from '../hooks/useInterval'
import useStationNumberIndexFunc from '../hooks/useStationNumberIndexFunc'
import useTransferLinesFromStation from '../hooks/useTransferLinesFromStation'
import lineState from '../store/atoms/line'
import stationState from '../store/atoms/station'
import { isEnSelector } from '../store/selectors/isEn'
import getStationNameR from '../utils/getStationNameR'
import getIsPass from '../utils/isPass'
import isTablet from '../utils/isTablet'
import { RFValue } from '../utils/rfValue'
import { widthScale } from '../utils/scale'
import BarTerminal from './BarTerminalEast'
import Chevron from './ChervronTY'
import PadLineMarks from './PadLineMarks'
import PassChevronTY from './PassChevronTY'
import Typography from './Typography'

const { width: windowWidth, height: windowHeight } = Dimensions.get('window')
const BAR_HEIGHT = isTablet ? 48 : 32

const useBarStyles = ({
  index,
}: {
  index?: number
}): { left: number; width: number } => {
  const left = useMemo(() => {
    if (index === 0) {
      return widthScale(-32)
    }
    return widthScale(-20)
  }, [index])

  const width = useMemo(() => {
    if (isTablet) {
      if (index === 0) {
        return widthScale(200)
      }
      if (index === 1) {
        return widthScale(61.75)
      }
    }
    return widthScale(62)
  }, [index])
  return { left, width }
}

type Props = {
  lineColors: (string | null | undefined)[]
  stations: Station[]
  hasTerminus: boolean
}

const getBarTerminalRight = (): number => {
  if (isTablet) {
    return -42
  }
  return -31
}

const barBottom = ((): number => {
  if (isTablet) {
    return -52
  }
  return 32
})()

const barTerminalBottom = ((): number => {
  if (isTablet) {
    return -54
  }
  return 32
})()

const styles = StyleSheet.create({
  root: {
    height: '100%',
    paddingBottom: isTablet ? windowHeight / 2.5 : undefined,
  },
  bar: {
    position: 'absolute',
    bottom: barBottom,
    height: BAR_HEIGHT,
  },
  barTerminal: {
    width: isTablet ? 42 : 33.7,
    height: isTablet ? 53 : 32,
    position: 'absolute',
    right: getBarTerminalRight(),
    bottom: barTerminalBottom,
  },
  stationNameWrapper: {
    flexDirection: 'row',
    justifyContent: isTablet ? 'flex-start' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  stationNameContainer: {
    position: 'relative',
    width: windowWidth / 9,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 84 : undefined,
  },
  stationName: {
    textAlign: 'center',
    fontSize: RFValue(16),
    fontWeight: 'bold',
    marginLeft: isTablet ? 5 : 2.5,
    marginBottom: Platform.select({ android: -6, ios: 0 }),
  },
  stationNameExtra: {
    width: RFValue(10),
    textAlign: 'center',
    fontSize: RFValue(10),
    fontWeight: 'bold',
    marginBottom: 0,
  },
  stationNameEn: {
    fontSize: RFValue(16),
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: isTablet ? 0 : -30,
  },
  stationNameHorizontalContainer: {
    position: isTablet ? 'absolute' : 'relative',
    bottom: 0,
    justifyContent: 'flex-start',
  },
  stationNameHorizontalWrapper: {
    bottom: isTablet ? 32 : 24,
  },
  stationNameHorizontalText: {
    position: 'absolute',
    transform: [{ rotate: '-55deg' }],
    fontSize: RFValue(16),
    fontWeight: 'bold',
    bottom: isTablet ? BAR_HEIGHT + 15 : BAR_HEIGHT + 35,
    left: isTablet ? -BAR_HEIGHT / 2 : -BAR_HEIGHT,
    width: isTablet ? 200 : windowHeight / 2,
  },
  stationNameHorizontalTextExtra: {
    fontSize: RFValue(10),
    fontWeight: 'bold',
  },
  grayColor: {
    color: '#ccc',
  },
  stationArea: {
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -46 : 32 + 4,
    overflow: 'visible',
  },
  chevron: {
    position: 'absolute',
    zIndex: 9999,
    bottom: 32,
    marginLeft: widthScale(14),
    width: isTablet ? 48 : 32,
    height: isTablet ? 48 : 32,
    marginTop: isTablet ? -6 : -4,
  },
  chevronArea: {
    width: isTablet ? 48 : 16,
    height: isTablet ? 32 : 24,
  },
  chevronAreaPass: {
    width: isTablet ? 48 : 16,
    height: isTablet ? 32 : 24,
    marginLeft: isTablet ? 0 : widthScale(5),
  },
  splittedStationNameWithExtraLang: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
    bottom: 24,
  },
  stationNumber: {
    position: 'absolute',
    bottom: isTablet ? 0 : barBottom + 32,
    width: isTablet ? 60 : 45,
    marginLeft: -5,
    fontSize: RFValue(12),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  marksContainer: { top: 38, position: 'absolute' },
})
interface StationNameProps {
  station: Station
  en?: boolean
  horizontal?: boolean
  passed?: boolean
}

interface StationNameCellProps {
  station: Station
  index: number
  stations: Station[]
  line: Line
  lineColors: (string | null | undefined)[]
  hasTerminus: boolean
  chevronColor: 'RED' | 'BLUE' | 'WHITE'
}

const StationName: React.FC<StationNameProps> = ({
  station,
  en,
  horizontal,
  passed,
}: StationNameProps) => {
  const stationNameR = getStationNameR(station)
  if (en) {
    if (station.nameChinese?.length) {
      return (
        <View style={styles.stationNameHorizontalContainer}>
          <View style={styles.stationNameHorizontalWrapper}>
            <Typography
              style={[
                styles.stationNameHorizontalText,
                passed ? styles.grayColor : null,
              ]}
            >
              {station.nameRoman}
              {'\n'}
              <Typography
                style={[
                  styles.stationNameHorizontalTextExtra,
                  passed ? styles.grayColor : null,
                ]}
              >
                {station.nameChinese}
              </Typography>
            </Typography>
          </View>
        </View>
      )
    }

    return (
      <Typography
        style={[styles.stationNameEn, passed ? styles.grayColor : null]}
      >
        {stationNameR}
      </Typography>
    )
  }

  if (horizontal) {
    if (station.nameKorean?.length) {
      return (
        <View style={styles.stationNameHorizontalContainer}>
          <View style={styles.stationNameHorizontalWrapper}>
            <Typography
              style={[
                styles.stationNameHorizontalText,
                passed ? styles.grayColor : null,
              ]}
            >
              {station.name}
              {'\n'}
              <Typography
                style={[
                  styles.stationNameHorizontalTextExtra,
                  passed ? styles.grayColor : null,
                ]}
              >
                {station.nameKorean}
              </Typography>
            </Typography>
          </View>
        </View>
      )
    }

    return (
      <Typography
        style={[styles.stationNameEn, passed ? styles.grayColor : null]}
      >
        {station.name}
      </Typography>
    )
  }

  if (station.nameKorean?.length) {
    return (
      <View style={styles.splittedStationNameWithExtraLang}>
        <View>
          {station.name.split('').map((c, j) => (
            <Typography
              style={[styles.stationName, passed ? styles.grayColor : null]}
              key={`${j + 1}${c}`}
            >
              {c}
            </Typography>
          ))}
        </View>
        <View>
          {station.nameKorean?.split('').map((c, j) => (
            <Typography
              style={[
                styles.stationNameExtra,
                passed ? styles.grayColor : null,
              ]}
              key={`${j + 1}${c}`}
            >
              {c}
            </Typography>
          ))}
        </View>
      </View>
    )
  }

  return (
    <>
      {station.name.split('').map((c, j) => (
        <Typography
          style={[styles.stationName, passed ? styles.grayColor : null]}
          key={`${j + 1}${c}`}
        >
          {c}
        </Typography>
      ))}
    </>
  )
}

type LineDotProps = {
  station: Station
  shouldGrayscale: boolean
  transferLines: Line[]
  arrived: boolean
  passed: boolean
}

const LineDot: React.FC<LineDotProps> = ({
  station,
  shouldGrayscale,
  transferLines,
  arrived,
  passed,
}) => {
  if (getIsPass(station)) {
    return (
      <View style={styles.stationArea}>
        <View style={styles.chevronAreaPass}>
          <PassChevronTY />
        </View>
        <View style={styles.marksContainer}>
          <PadLineMarks
            shouldGrayscale={shouldGrayscale}
            transferLines={transferLines}
            station={station}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.stationArea}>
      <View style={styles.chevronArea}>
        <LinearGradient
          style={{ width: isTablet ? 48 : 32, height: isTablet ? 36 : 24 }}
          colors={
            passed && !arrived ? ['#ccc', '#dadada'] : ['#fdfbfb', '#ebedee']
          }
        />
      </View>
      <View style={styles.marksContainer}>
        <PadLineMarks
          shouldGrayscale={shouldGrayscale}
          transferLines={transferLines}
          station={station}
        />
      </View>
    </View>
  )
}

const StationNameCell: React.FC<StationNameCellProps> = ({
  station,
  index,
  stations,
  line,
  lineColors,
  hasTerminus,
  chevronColor,
}: StationNameCellProps) => {
  const { station: currentStation, arrived } = useRecoilValue(stationState)
  const isEn = useRecoilValue(isEnSelector)

  const currentStationIndex = stations.findIndex(
    (s) => s.groupId === currentStation?.groupId
  )

  const passed = index <= currentStationIndex || (!index && !arrived)
  const shouldGrayscale =
    getIsPass(station) ||
    (arrived && currentStationIndex === index ? false : passed)

  const transferLines = useTransferLinesFromStation(station, {
    omitJR: true,
    omitRepeatingLine: true,
  })

  const { left: barLeft, width: barWidth } = useBarStyles({ index })

  const additionalChevronStyle = ((): { left: number } | null => {
    if (!index) {
      if (arrived) {
        return {
          left: widthScale(-14),
        }
      }
      return null
    }
    if (arrived) {
      return {
        left: widthScale(41.75 * index) - widthScale(14),
      }
    }
    if (!passed) {
      if (!arrived) {
        return {
          left: widthScale(42 * index),
        }
      }
      return {
        left: widthScale(45 * index),
      }
    }
    return {
      left: widthScale(42 * index),
    }
  })()

  const includesLongStationName = useMemo(
    () =>
      !!stations.filter((s) => s.name.includes('ー') || s.name.length > 6)
        .length,
    [stations]
  )

  const getStationNumberIndex = useStationNumberIndexFunc()
  const stationNumberIndex = getStationNumberIndex(currentStation)
  const numberingObj = useMemo<StationNumber | undefined>(
    () => station.stationNumbers?.[stationNumberIndex],
    [station.stationNumbers, stationNumberIndex]
  )

  return (
    <>
      <View
        key={station.name}
        style={{
          ...styles.stationNameContainer,
          paddingBottom: isTablet ? 0 : numberingObj ? 64 : 48,
        }}
      >
        <StationName
          station={station}
          en={isEn}
          horizontal={includesLongStationName}
          passed={getIsPass(station) || shouldGrayscale}
        />
        <Typography
          style={[
            styles.stationNumber,
            getIsPass(station) || shouldGrayscale ? styles.grayColor : null,
          ]}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {numberingObj?.stationNumber ?? ''}
        </Typography>
        <LinearGradient
          colors={['#fff', '#000', '#000', '#fff']}
          locations={[0.5, 0.5, 0.5, 0.9]}
          style={{
            ...styles.bar,
            left: barLeft,
            width: barWidth,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          }}
        />
        <LinearGradient
          colors={
            line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb']
          }
          style={{
            ...styles.bar,
            left: barLeft,
            width: barWidth,
          }}
        />
        {(arrived && currentStationIndex < index + 1) || !passed ? (
          <LinearGradient
            colors={['#fff', '#000', '#000', '#fff']}
            locations={[0.5, 0.5, 0.5, 0.9]}
            style={{
              ...styles.bar,
              left: barLeft,
              width: barWidth,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
          />
        ) : null}
        {arrived &&
        currentStationIndex !== 0 &&
        currentStationIndex === index &&
        currentStationIndex !== stations.length - 1 ? (
          <LinearGradient
            colors={
              line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb']
            }
            style={{
              ...styles.bar,
              left: barLeft,
              width: barWidth / 2.5,
            }}
          />
        ) : null}
        {(arrived && currentStationIndex < index + 1) || !passed ? (
          <LinearGradient
            colors={
              line.color
                ? [
                    `${lineColors[index] || line.color}ff`,
                    `${lineColors[index] || line.color}bb`,
                  ]
                : ['#000000ff', '#000000bb']
            }
            style={{
              ...styles.bar,
              left:
                currentStationIndex !== 0 &&
                currentStationIndex === index &&
                currentStationIndex !== stations.length - 1
                  ? barLeft + barWidth / 2.5
                  : barLeft,
              width:
                currentStationIndex !== 0 &&
                currentStationIndex === index &&
                currentStationIndex !== stations.length - 1
                  ? barWidth / 2.5
                  : barWidth,
            }}
          />
        ) : null}
        <LineDot
          station={station}
          shouldGrayscale={shouldGrayscale}
          transferLines={transferLines}
          arrived={arrived}
          passed={passed}
        />
        {stations.length - 1 === index ? (
          <BarTerminal
            style={styles.barTerminal}
            lineColor={
              line.color
                ? lineColors[lineColors.length - 1] || line.color
                : '#000'
            }
            hasTerminus={hasTerminus}
          />
        ) : null}
      </View>
      <View style={[styles.chevron, additionalChevronStyle]}>
        {(currentStationIndex < 1 && index === 0) ||
        currentStationIndex === index ? (
          <Chevron color={chevronColor} />
        ) : null}
      </View>
    </>
  )
}

type EmptyStationNameCellProps = {
  lastLineColor: string
  isLast: boolean
  hasTerminus: boolean
}

const EmptyStationNameCell: React.FC<EmptyStationNameCellProps> = ({
  lastLineColor: lastLineColorOriginal,
  isLast,
  hasTerminus,
}: EmptyStationNameCellProps) => {
  const lastLineColor = lastLineColorOriginal
  const { left: barLeft, width: barWidth } = useBarStyles({})

  return (
    <View style={styles.stationNameContainer}>
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          left: barLeft,
          width: barWidth,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      />
      <LinearGradient
        colors={
          lastLineColor
            ? [`${lastLineColor}ff`, `${lastLineColor}bb`]
            : ['#000000ff', '#000000bb']
        }
        style={{
          ...styles.bar,
          left: barLeft,
          width: barWidth,
        }}
      />
      {isLast ? (
        <BarTerminal
          style={styles.barTerminal}
          lineColor={lastLineColor}
          hasTerminus={hasTerminus}
        />
      ) : null}
    </View>
  )
}
const LineBoardToei: React.FC<Props> = ({
  stations,
  hasTerminus,
  lineColors,
}: Props) => {
  const [chevronColor, setChevronColor] = useState<'RED' | 'BLUE'>('BLUE')
  const { selectedLine } = useRecoilValue(lineState)
  const currentLine = useCurrentLine()

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  )

  const intervalStep = useCallback(() => {
    const timestamp = new Date().getTime()
    if (Math.floor(timestamp) % 2 === 0) {
      setChevronColor('RED')
      return
    }
    setChevronColor('BLUE')
  }, [])

  useInterval(intervalStep, 1000)

  const stationNameCellForMap = useCallback(
    (s: Station, i: number): JSX.Element | null => {
      if (!s) {
        return (
          <EmptyStationNameCell
            lastLineColor={
              lineColors[lineColors.length - 1] || line?.color || '#fff'
            }
            key={i}
            isLast={
              [...stations, ...Array.from({ length: 8 - stations.length })]
                .length -
                1 ===
              i
            }
            hasTerminus={hasTerminus}
          />
        )
      }

      if (!line) {
        return null
      }

      return (
        <React.Fragment key={s.groupId}>
          <StationNameCell
            station={s}
            stations={stations}
            index={i}
            line={line}
            lineColors={lineColors}
            hasTerminus={hasTerminus}
            chevronColor={chevronColor}
          />
        </React.Fragment>
      )
    },
    [chevronColor, hasTerminus, line, lineColors, stations]
  )

  return (
    <View style={styles.root}>
      <View style={styles.stationNameWrapper}>
        {(
          [
            ...stations,
            ...Array.from({ length: 8 - stations.length }),
          ] as Station[]
        ).map(stationNameCellForMap)}
      </View>
    </View>
  )
}

export default React.memo(LineBoardToei)
