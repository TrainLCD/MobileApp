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
import { FONTS } from '../constants'
import useGetLineMark from '../hooks/useGetLineMark'
import useHasPassStationInRegion from '../hooks/useHasPassStationInRegion'
import useIsPassing from '../hooks/useIsPassing'
import { useNextStation } from '../hooks/useNextStation'
import usePreviousStation from '../hooks/usePreviousStation'
import useStationNumberIndexFunc from '../hooks/useStationNumberIndexFunc'
import useTransferLinesFromStation from '../hooks/useTransferLinesFromStation'
import { APP_THEME } from '../models/Theme'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { currentLineSelector } from '../store/selectors/currentLine'
import { currentStationSelector } from '../store/selectors/currentStation'
import { isEnSelector } from '../store/selectors/isEn'
import getStationNameR from '../utils/getStationNameR'
import isFullSizedTablet from '../utils/isFullSizedTablet'
import getIsPass from '../utils/isPass'
import isSmallTablet from '../utils/isSmallTablet'
import isTablet from '../utils/isTablet'
import { heightScale } from '../utils/scale'
import Chevron from './ChevronJRWest'
import PadLineMarks from './PadLineMarks'
import Typography from './Typography'

interface Props {
  stations: Station[]
  lineColors: (string | null | undefined)[]
}

const { width: windowWidth, height: windowHeight } = Dimensions.get('window')
const barWidth = isTablet ? (windowWidth - 72) / 8 : (windowWidth - 48) / 8

const barBottom = ((): number => {
  if (isFullSizedTablet) {
    return 32
  }
  if (isSmallTablet) {
    return 138
  }
  return 48
})()

const barTerminalBottom = ((): number => {
  if (isFullSizedTablet) {
    return 32
  }
  if (isSmallTablet) {
    return 138
  }
  return 48
})()

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: windowHeight,
    bottom: isFullSizedTablet ? windowHeight / 2.5 : undefined,
  },
  bar: {
    position: 'absolute',
    bottom: barBottom,
    width: barWidth,
    height: isTablet ? 64 : 32,
  },
  barTerminal: {
    left: isTablet ? windowWidth - 72 + 6 : windowWidth - 48 + 6,
    position: 'absolute',
    width: 0,
    height: 0,
    bottom: barTerminalBottom,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: isTablet ? 32 : 16,
    borderRightWidth: isTablet ? 32 : 16,
    borderBottomWidth: isTablet ? 64 : 32,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '90deg' }],
    margin: 0,
    marginLeft: -6,
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
    paddingBottom: !isFullSizedTablet ? 96 : undefined,
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
      ? Platform.select({
          ios: 48 * 0.25,
          android: 0,
        })
      : 24 * 0.25,
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
    bottom: (() => {
      if (isFullSizedTablet) {
        return -70
      }
      if (isSmallTablet) {
        return 35
      }
      return 50
    })(),
    overflow: 'visible',
    borderRadius: 24,
  },
  arrivedLineDot: {
    backgroundColor: 'crimson',
    width: isTablet ? 44 : 24,
    height: isTablet ? 44 : 24,
    borderRadius: 22,
    position: 'absolute',
    left: 2,
    top: 2,
  },
  chevron: {
    marginLeft: isTablet ? 48 : 24,
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
    marginTop: isTablet ? 6 : 2,
  },
  topBar: {
    width: 8,
    height: 8,
    backgroundColor: '#212121',
    alignSelf: 'center',
    marginTop: -16,
  },
  passMark: {
    width: isTablet ? 24 : 14,
    height: isTablet ? 8 : 6,
    position: 'absolute',
    left: isTablet ? 48 + 38 : 28 + 28, // dotWidth + margin
    top: isTablet ? 48 * 0.45 : 28 * 0.4, // (almost) half dotHeight
  },
  numberingContainer: {
    marginLeft: isTablet ? -48 * 0.125 : -24 * 0.25,
    width: isTablet ? 48 * 1.25 : 24 * 1.75,
    height: isTablet ? 48 / 2 : 24 / 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberingText: {
    fontWeight: 'bold',
    fontSize: isTablet ? 48 / 2.5 : 24 / 1.75,
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: -2,
    textAlign: 'center',
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
  index: number
}

const StationNameCell: React.FC<StationNameCellProps> = ({
  stations,
  arrived,
  station: stationInLoop,
  index,
}: StationNameCellProps) => {
  const { leftStations } = useRecoilValue(navigationState)
  const { stations: allStations } = useRecoilValue(stationState)
  const isEn = useRecoilValue(isEnSelector)

  const station = useRecoilValue(currentStationSelector({}))
  const transferLines = useTransferLinesFromStation(stationInLoop, {
    omitJR: true,
  })

  const nextStation = useNextStation(true, stationInLoop)
  const prevStation = usePreviousStation(false)

  const currentStationIndex = useMemo(
    () =>
      leftStations.findIndex(
        (s) => s.groupId === (arrived ? station : prevStation)?.groupId
      ),
    [arrived, station, leftStations, prevStation]
  )

  const passed = useMemo(
    () =>
      arrived
        ? index < currentStationIndex
        : index <= currentStationIndex ||
          (!index && !arrived) ||
          getIsPass(stationInLoop),
    [arrived, index, stationInLoop, currentStationIndex]
  )

  const getStationNumberIndex = useStationNumberIndexFunc()
  const stationNumberIndex = getStationNumberIndex(stationInLoop)
  const numberingObj = useMemo<StationNumber | undefined>(
    () => stationInLoop.stationNumbers?.[stationNumberIndex],
    [stationInLoop.stationNumbers, stationNumberIndex]
  )

  const stationNumberString = useMemo(
    () => numberingObj?.stationNumber?.split('-').join('') ?? '',
    [numberingObj?.stationNumber]
  )
  const stationNumberBGColor = useMemo(
    () => (passed ? '#aaa' : numberingObj?.lineSymbolColor) ?? '#000',
    [passed, numberingObj?.lineSymbolColor]
  )
  const stationNumberTextColor = useMemo(() => {
    if (passed) {
      return '#fff'
    }
    if (numberingObj?.lineSymbolShape.includes('DARK_TEXT')) {
      return '#231f20'
    }

    return '#fff'
  }, [passed, numberingObj?.lineSymbolShape])

  const getLineMarks = useGetLineMark()

  const lineMarks = useMemo(
    () => transferLines.map((line) => getLineMarks({ line })),
    [getLineMarks, transferLines]
  )

  const hasPassStationInRegion = useHasPassStationInRegion(
    allStations,
    stationInLoop,
    nextStation ?? null
  )

  const includesLongStationName = useMemo(
    () =>
      !!stations.filter((s) => s.name.includes('ー') || s.name.length > 6)
        .length,
    [stations]
  )

  return (
    <View key={stationInLoop.name} style={styles.stationNameContainer}>
      <StationName
        stations={stations}
        station={stationInLoop}
        en={isEn}
        horizontal={includesLongStationName}
        passed={passed}
        index={index}
      />
      {numberingObj ? (
        <View
          style={{
            ...styles.numberingContainer,
            backgroundColor: stationNumberBGColor,
            marginBottom: passed && isTablet ? -4 : -6,
          }}
        >
          <Typography
            style={{ ...styles.numberingText, color: stationNumberTextColor }}
          >
            {stationNumberString}
          </Typography>
        </View>
      ) : null}

      <View
        style={{
          ...styles.lineDot,
          backgroundColor: passed ? '#aaa' : '#fff',
        }}
      >
        {isTablet && !isSmallTablet && lineMarks.length && !passed ? (
          <View style={styles.topBar} />
        ) : null}

        {arrived && currentStationIndex === index ? (
          <View style={styles.arrivedLineDot} />
        ) : null}
        <View
          style={[
            styles.chevron,
            !lineMarks.length ? { marginTop: isTablet ? 8 : 2 } : undefined,
          ]}
        >
          {!arrived &&
          (currentStationIndex === index ||
            (currentStationIndex === -1 && !index)) ? (
            <Chevron />
          ) : null}
        </View>
        {hasPassStationInRegion && index !== stations.length - 1 ? (
          <View
            style={{
              ...styles.passMark,
              backgroundColor:
                passed && index !== currentStationIndex ? '#aaa' : '#fff',
            }}
          />
        ) : null}
        {!passed ? (
          <PadLineMarks
            shouldGrayscale={passed}
            transferLines={transferLines}
            station={stationInLoop}
            theme={APP_THEME.JR_WEST}
          />
        ) : null}
      </View>
    </View>
  )
}

const LineBoardWest: React.FC<Props> = ({ stations, lineColors }: Props) => {
  const { selectedLine } = useRecoilValue(lineState)
  const isPassing = useIsPassing()
  const currentLine = useRecoilValue(currentLineSelector)

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  )

  const stationNameCellForMap = useCallback(
    (s: Station, i: number): JSX.Element => (
      <StationNameCell
        key={s.groupId}
        station={s}
        stations={stations}
        arrived={!isPassing}
        index={i}
      />
    ),
    [isPassing, stations]
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
            backgroundColor: lc ? lc : line?.color ?? '#000',
          }}
        />
      ))}

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

export default React.memo(LineBoardWest)
