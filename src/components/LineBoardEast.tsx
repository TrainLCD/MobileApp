import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useMemo, useState } from 'react'
import {
  Dimensions,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
} from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilValue } from 'recoil'
import { parenthesisRegexp } from '../constants/regexp'
import { Line, Station } from '../gen/stationapi_pb'
import useCurrentLine from '../hooks/useCurrentLine'
import useIntervalEffect from '../hooks/useIntervalEffect'
import useIsEn from '../hooks/useIsEn'
import useStationNumberIndexFunc from '../hooks/useStationNumberIndexFunc'
import useTransferLinesFromStation from '../hooks/useTransferLinesFromStation'
import lineState from '../store/atoms/line'
import stationState from '../store/atoms/station'
import getStationNameR from '../utils/getStationNameR'
import isFullSizedTablet from '../utils/isFullSizedTablet'
import getIsPass from '../utils/isPass'
import isSmallTablet from '../utils/isSmallTablet'
import isTablet from '../utils/isTablet'
import omitJRLinesIfThresholdExceeded from '../utils/jr'
import prependHEX from '../utils/prependHEX'
import { heightScale, widthScale } from '../utils/scale'
import BarTerminal from './BarTerminalEast'
import Chevron from './ChervronTY'
import PadLineMarks from './PadLineMarks'
import PassChevronTY from './PassChevronTY'
import Typography from './Typography'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

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
  stations: Station.AsObject[]
  hasTerminus: boolean
  withExtraLanguage: boolean
}

const getStationNameEnExtraStyle = (): StyleProp<TextStyle> => {
  if (!isTablet) {
    return {
      width: heightScale(320),
      marginBottom: 58,
    }
  }
  return {
    width: 250,
    marginBottom: isSmallTablet ? 106 : 96,
  }
}

const getBarTerminalRight = (): number => {
  if (isTablet) {
    return -42
  }
  return -31
}

const barBottom = ((): number => {
  if (isFullSizedTablet) {
    return -52
  }
  if (isSmallTablet) {
    return 30
  }
  return 32
})()

const barTerminalBottom = ((): number => {
  if (isFullSizedTablet) {
    return -54
  }
  if (isSmallTablet) {
    return 28
  }
  return 32
})()

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: screenHeight,
    bottom: isFullSizedTablet ? screenHeight / 2.5 : undefined,
  },
  bar: {
    position: 'absolute',
    bottom: barBottom,
    height: isTablet ? 48 : 32,
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
    justifyContent: isFullSizedTablet ? 'flex-start' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  stationNameContainer: {
    width: screenWidth / 9,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 84 : undefined,
    paddingBottom: !isFullSizedTablet ? 84 : undefined,
  },
  stationName: {
    width: RFValue(21),
    textAlign: 'center',
    fontSize: RFValue(18),
    fontWeight: 'bold',
    marginLeft: isTablet ? 5 : 2.5,
  },
  stationNameExtra: {
    width: RFValue(11),
    textAlign: 'center',
    fontSize: RFValue(11),
    fontWeight: 'bold',
  },
  stationNameEn: {
    fontSize: RFValue(18),
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: -30,
  },
  stationNameHorizontalJa: {
    fontSize: RFValue(18),
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: widthScale(-12.75),
    position: 'absolute',
    bottom: isTablet && !isFullSizedTablet ? 0 : 16,
  },
  stationNameHorizontalExtra: {
    fontSize: RFValue(11),
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: -5,
    bottom: isTablet && !isFullSizedTablet ? 0 : 16,
  },
  grayColor: {
    color: '#ccc',
  },
  lineDot: {
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
    position: 'absolute',
    zIndex: 9999,
    bottom: isFullSizedTablet ? -46 : 32 + 4,
    overflow: 'visible',
  },
  chevron: {
    position: 'absolute',
    zIndex: 9999,
    bottom: isSmallTablet ? 115 : 32,
    marginLeft: widthScale(14),
    width: isTablet ? 48 : 32,
    height: isTablet ? 48 : 32,
    marginTop: isTablet ? -6 : -4,
  },
  passChevron: {
    width: isTablet ? 48 : 16,
    height: isTablet ? 32 : 24,
    marginLeft: isTablet ? 0 : widthScale(5),
  },
  stationNameWithExtraLang: {
    position: 'relative',
    bottom: isFullSizedTablet ? -16 : 0,
  },
  splittedStationNameWithExtraLang: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
    bottom: isSmallTablet ? 16 : 0,
  },
  stationNumber: {
    width: screenWidth / 9,
    fontSize: RFValue(12),
    fontWeight: 'bold',
    bottom: isSmallTablet ? 16 : 0,
  },
  marksContainer: { marginTop: 8 },
})
interface StationNameProps {
  station: Station.AsObject
  en?: boolean
  horizontal?: boolean
  passed?: boolean
  withExtraLanguage: boolean
}

interface StationNameCellProps {
  station: Station.AsObject
  index: number
  stations: Station.AsObject[]
  line: Line.AsObject
  lineColors: (string | null | undefined)[]
  hasTerminus: boolean
  chevronColor: 'RED' | 'BLUE' | 'WHITE'
  withExtraLanguage: boolean
}

const StationName: React.FC<StationNameProps> = ({
  station,
  en,
  horizontal,
  passed,
  withExtraLanguage,
}: StationNameProps) => {
  const stationNameR = getStationNameR(station)
  if (en) {
    if (withExtraLanguage && station.nameChinese.length) {
      return (
        <View style={styles.stationNameWithExtraLang}>
          <Typography
            style={[
              styles.stationNameHorizontalJa,
              getStationNameEnExtraStyle(),
              passed ? styles.grayColor : null,
            ]}
          >
            {stationNameR}
          </Typography>
          <Typography
            style={[
              styles.stationNameHorizontalExtra,
              getStationNameEnExtraStyle(),
              passed ? styles.grayColor : null,
            ]}
          >
            {station.nameChinese}
          </Typography>
        </View>
      )
    }

    return (
      <Typography
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(),
          passed ? styles.grayColor : null,
        ]}
      >
        {stationNameR}
      </Typography>
    )
  }

  if (horizontal) {
    if (withExtraLanguage && station.nameKorean.length) {
      return (
        <View style={styles.stationNameWithExtraLang}>
          <Typography
            style={[
              styles.stationNameHorizontalJa,
              getStationNameEnExtraStyle(),
              passed ? styles.grayColor : null,
            ]}
          >
            {station.name}
          </Typography>
          <Typography
            style={[
              styles.stationNameHorizontalExtra,
              getStationNameEnExtraStyle(),
              passed ? styles.grayColor : null,
            ]}
          >
            {station.nameKorean}
          </Typography>
        </View>
      )
    }

    return (
      <Typography
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(),
          passed ? styles.grayColor : null,
        ]}
      >
        {station.name}
      </Typography>
    )
  }

  if (withExtraLanguage && station.nameKorean.length) {
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
          {station.nameKorean.split('').map((c, j) => (
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
  station: Station.AsObject
  shouldGrayscale: boolean
  transferLines: Line.AsObject[]
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
      <View style={styles.lineDot}>
        <View style={styles.passChevron}>
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
    <LinearGradient
      colors={passed && !arrived ? ['#ccc', '#dadada'] : ['#fdfbfb', '#ebedee']}
      style={styles.lineDot}
    >
      <View
        style={{
          position: 'absolute',
          top: 38,
        }}
      >
        <PadLineMarks
          shouldGrayscale={shouldGrayscale}
          transferLines={transferLines}
          station={station}
        />
      </View>
    </LinearGradient>
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
  withExtraLanguage,
}: StationNameCellProps) => {
  const { station: currentStation, arrived } = useRecoilValue(stationState)

  const isEn = useIsEn()

  const currentStationIndex = stations.findIndex(
    (s) => s.groupId === currentStation?.groupId
  )

  const passed = index <= currentStationIndex || (!index && !arrived)
  const shouldGrayscale =
    getIsPass(station) ||
    (arrived && currentStationIndex === index ? false : passed)

  const transferLines = useTransferLinesFromStation(station)
  const omittedTransferLines = useMemo(
    () =>
      omitJRLinesIfThresholdExceeded(transferLines).map((l) => ({
        ...l,
        nameShort: l.nameShort.replace(parenthesisRegexp, ''),
        nameRoman: l.nameRoman.replace(parenthesisRegexp, ''),
      })),
    [transferLines]
  )

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
  const stationNumberIndex = getStationNumberIndex(line)

  return (
    <>
      <View
        key={station.name}
        style={[
          styles.stationNameContainer,
          withExtraLanguage && {
            paddingBottom: !isFullSizedTablet ? 64 : undefined,
          },
        ]}
      >
        <StationName
          station={station}
          en={isEn}
          horizontal={includesLongStationName}
          passed={getIsPass(station) || shouldGrayscale}
          withExtraLanguage={withExtraLanguage}
        />
        {withExtraLanguage &&
        station.stationNumbersList[stationNumberIndex]?.stationNumber ? (
          <Typography
            style={[
              styles.stationNumber,
              getIsPass(station) || shouldGrayscale ? styles.grayColor : null,
            ]}
          >
            {station.stationNumbersList[stationNumberIndex]?.stationNumber}
          </Typography>
        ) : null}
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
                    `${prependHEX(lineColors[index] || line.color)}ff`,
                    `${prependHEX(lineColors[index] || line.color)}bb`,
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
          transferLines={omittedTransferLines}
          arrived={arrived}
          passed={passed}
        />
        {stations.length - 1 === index ? (
          <BarTerminal
            style={styles.barTerminal}
            lineColor={
              line.color
                ? prependHEX(lineColors[lineColors.length - 1] || line.color)
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
  const lastLineColor = prependHEX(lastLineColorOriginal)
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
const LineBoardEast: React.FC<Props> = ({
  stations,
  hasTerminus,
  lineColors,
  withExtraLanguage,
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

  useIntervalEffect(intervalStep, 1000)

  const stationNameCellForMap = useCallback(
    (s: Station.AsObject, i: number): JSX.Element | null => {
      if (!s) {
        return (
          <EmptyStationNameCell
            lastLineColor={
              lineColors[lineColors.length - 1] ||
              prependHEX(line?.color || '#fff')
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
            withExtraLanguage={withExtraLanguage}
          />
        </React.Fragment>
      )
    },
    [chevronColor, hasTerminus, line, lineColors, stations, withExtraLanguage]
  )

  return (
    <View style={styles.root}>
      <View style={styles.stationNameWrapper}>
        {(
          [
            ...stations,
            ...Array.from({ length: 8 - stations.length }),
          ] as Station.AsObject[]
        ).map(stationNameCellForMap)}
      </View>
    </View>
  )
}

export default React.memo(LineBoardEast)
