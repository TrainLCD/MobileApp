import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import {
  Platform,
  type StyleProp,
  StyleSheet,
  type TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import type { Line, Station, StationNumber } from '~/@types/graphql';
import { FONTS } from '~/constants';
import {
  useCurrentLine,
  useCurrentStation,
  useGetLineMark,
  useHasPassStationInRegion,
  useIsPassing,
  useNextStation,
  usePreviousStation,
  useStationNumberIndexFunc,
  useTransferLinesFromStation,
} from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import lineState from '~/store/atoms/line';
import navigationState from '~/store/atoms/navigation';
import stationState from '~/store/atoms/station';
import { isEnAtom } from '~/store/selectors/isEn';
import getStationNameR from '~/utils/getStationNameR';
import getIsPass from '~/utils/isPass';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import { ChevronJRWest } from './ChevronJRWest';
import PadLineMarks from './PadLineMarks';
import Typography from './Typography';

interface Props {
  stations: Station[];
  lineColors: (string | null | undefined)[];
}

const useBarWidth = () => {
  const dim = useWindowDimensions();
  return useMemo(
    () => (isTablet ? (dim.width - 72) / 8 : (dim.width - 48) / 8),
    [dim.width]
  );
};

const barSize = isTablet ? 32 : 48;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    bottom: isTablet ? '40%' : undefined,
  },
  bar: {
    position: 'absolute',
    bottom: barSize,
    height: isTablet ? 64 : 32,
  },
  barTerminal: {
    position: 'absolute',
    width: 0,
    height: 0,
    bottom: barSize,
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
    position: 'relative',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 110 : undefined,
    paddingBottom: 0,
    width: `${100 / 9}%`,
  },
  stationName: {
    width: isTablet ? 48 : 32,
    fontSize: RFValue(18),
    fontWeight: 'bold',
    marginBottom: Platform.select({ android: -6, ios: 0 }),
    marginLeft: 5,
    bottom: isTablet ? 32 : 0,
  },
  stationNameEn: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
  },
  grayColor: {
    color: '#ccc',
  },
  lineDot: {
    width: isTablet ? 48 : 28,
    height: isTablet ? 48 : 28,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -70 : 50,
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
    position: 'absolute',
    bottom: isTablet ? 0 : barSize + 44,
    marginLeft: isTablet ? -48 * 0.125 : -28 * 0.25,
    width: isTablet ? 50 * 1.25 : 28 * 1.75,
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
});

interface StationNameProps {
  station: Station;
  en?: boolean;
  horizontal?: boolean;
  passed?: boolean;
  hasNumbering?: boolean;
}

const StationName: React.FC<StationNameProps> = ({
  station,
  en,
  horizontal,
  passed,
  hasNumbering,
}: StationNameProps) => {
  const stationNameR = useMemo(() => getStationNameR(station), [station]);

  const stationNameEnExtraStyle = useMemo((): StyleProp<TextStyle> => {
    if (!isTablet) {
      return {
        width: 180,
        marginBottom: 80,
      };
    }
    return {
      width: 250,
      marginBottom: hasNumbering ? 150 : 120,
    };
  }, [hasNumbering]);

  if (en) {
    return (
      <Typography
        style={[
          styles.stationNameEn,
          stationNameEnExtraStyle,
          passed ? styles.grayColor : null,
        ]}
      >
        {stationNameR}
      </Typography>
    );
  }
  if (horizontal) {
    return (
      <Typography
        style={[
          styles.stationNameEn,
          stationNameEnExtraStyle,
          passed ? styles.grayColor : null,
        ]}
      >
        {station.name}
      </Typography>
    );
  }
  return (
    <View>
      {station.name?.split('').map((c, j) => (
        <Typography
          style={[styles.stationName, passed ? styles.grayColor : null]}
          key={`${j + 1}${c}`}
        >
          {c}
        </Typography>
      ))}
    </View>
  );
};

interface StationNameCellProps {
  arrived: boolean;
  stations: Station[];
  station: Station;
  index: number;
  line: Line | null;
}

// Extract station numbering logic into a separate hook
const useStationNumberingData = (
  stationInLoop: Station,
  passed: boolean,
  line: Line | null
) => {
  const getStationNumberIndex = useStationNumberIndexFunc();
  const stationNumberIndex = useMemo(
    () => getStationNumberIndex(stationInLoop, line),
    [getStationNumberIndex, line, stationInLoop]
  );
  const numberingObj = useMemo<StationNumber | undefined>(
    () => stationInLoop.stationNumbers?.[stationNumberIndex],
    [stationInLoop.stationNumbers, stationNumberIndex]
  );

  const stationNumberString = useMemo(
    () => numberingObj?.stationNumber?.split('-').join('') ?? '',
    [numberingObj?.stationNumber]
  );
  const stationNumberBGColor = useMemo(
    () => (passed ? '#aaa' : numberingObj?.lineSymbolColor) ?? '#000',
    [passed, numberingObj?.lineSymbolColor]
  );
  const stationNumberTextColor = useMemo(() => {
    if (passed) {
      return '#fff';
    }
    if (numberingObj?.lineSymbolShape?.includes('DARK_TEXT')) {
      return '#231f20';
    }
    return '#fff';
  }, [passed, numberingObj?.lineSymbolShape]);

  return {
    numberingObj,
    stationNumberString,
    stationNumberBGColor,
    stationNumberTextColor,
  };
};

// Extract station progress calculation into a separate hook
const useStationProgress = (
  arrived: boolean,
  index: number,
  stationInLoop: Station
) => {
  const { leftStations } = useAtomValue(navigationState);
  const station = useCurrentStation();
  const prevStation = usePreviousStation(false);

  const currentStationIndex = useMemo(
    () =>
      leftStations.findIndex(
        (s) => s.groupId === (arrived ? station : prevStation)?.groupId
      ),
    [arrived, station, leftStations, prevStation]
  );

  const passed = useMemo(
    () =>
      arrived
        ? index < currentStationIndex
        : index <= currentStationIndex ||
          (!index && !arrived) ||
          getIsPass(stationInLoop),
    [arrived, index, stationInLoop, currentStationIndex]
  );

  return { currentStationIndex, passed };
};

// Helper to determine if chevron should be shown
const useShowChevron = (
  arrived: boolean,
  currentStationIndex: number,
  index: number
): boolean => {
  return useMemo(
    () =>
      !arrived &&
      (currentStationIndex === index || (currentStationIndex === -1 && !index)),
    [arrived, currentStationIndex, index]
  );
};

// Helper to determine pass mark background color
const getPassMarkBackgroundColor = (
  passed: boolean,
  index: number,
  currentStationIndex: number
): string => {
  const isBeforeCurrentStation = index < currentStationIndex;
  const isAtCurrentStation = index === currentStationIndex;
  const shouldBeGray = passed && !isAtCurrentStation;

  if (shouldBeGray || isBeforeCurrentStation) {
    return '#aaa';
  }

  return '#fff';
};

// Helper to determine if pass mark should be shown
const shouldShowPassMark = (
  hasPassStationInRegion: boolean,
  index: number,
  stationsLength: number
): boolean => {
  return hasPassStationInRegion && index !== stationsLength - 1;
};

// Extract station dot indicators into a separate component
const StationDotIndicators: React.FC<{
  passed: boolean;
  arrived: boolean;
  currentStationIndex: number;
  index: number;
  lineMarks: unknown[];
  hasPassStationInRegion: boolean;
  stations: Station[];
  transferLines: Line[];
  station: Station;
}> = ({
  passed,
  arrived,
  currentStationIndex,
  index,
  lineMarks,
  hasPassStationInRegion,
  stations,
  transferLines,
  station,
}) => {
  const showChevron = useShowChevron(arrived, currentStationIndex, index);
  const showTopBar = isTablet && lineMarks.length > 0 && !passed;
  const showArrivedDot = arrived && currentStationIndex === index;
  const showPassMark = shouldShowPassMark(
    hasPassStationInRegion,
    index,
    stations.length
  );
  const passMarkBgColor = getPassMarkBackgroundColor(
    passed,
    index,
    currentStationIndex
  );

  return (
    <View
      style={[styles.lineDot, { backgroundColor: passed ? '#aaa' : '#fff' }]}
    >
      {showTopBar ? <View style={styles.topBar} /> : null}

      {showArrivedDot ? <View style={styles.arrivedLineDot} /> : null}

      <View
        style={[
          styles.chevron,
          lineMarks.length ? undefined : { marginTop: isTablet ? 8 : 2 },
        ]}
      >
        {showChevron ? <ChevronJRWest /> : null}
      </View>

      {showPassMark ? (
        <View style={[styles.passMark, { backgroundColor: passMarkBgColor }]} />
      ) : null}

      {passed ? null : (
        <PadLineMarks
          shouldGrayscale={passed}
          transferLines={transferLines}
          station={station}
          theme={APP_THEME.JR_WEST}
        />
      )}
    </View>
  );
};

const StationNameCell: React.FC<StationNameCellProps> = ({
  stations,
  arrived,
  station: stationInLoop,
  index,
  line,
}: StationNameCellProps) => {
  const { stations: allStations } = useAtomValue(stationState);
  const isEn = useAtomValue(isEnAtom);

  const transferLines = useTransferLinesFromStation(stationInLoop, {
    omitJR: true,
    omitRepeatingLine: true,
  });

  const nextStation = useNextStation(true, stationInLoop);
  const { currentStationIndex, passed } = useStationProgress(
    arrived,
    index,
    stationInLoop
  );

  const {
    numberingObj,
    stationNumberString,
    stationNumberBGColor,
    stationNumberTextColor,
  } = useStationNumberingData(stationInLoop, passed, line);

  const getLineMarks = useGetLineMark();
  const lineMarks = useMemo(
    () => transferLines.map((line) => getLineMarks({ line })),
    [getLineMarks, transferLines]
  );

  const hasPassStationInRegion = useHasPassStationInRegion(
    allStations,
    stationInLoop,
    nextStation ?? null
  );

  const includesLongStationName = useMemo(
    () =>
      !!stations.filter(
        (s) => s.name?.includes('ー') || (s.name?.length ?? 0) > 6
      ).length,
    [stations]
  );

  const paddingBottom = useMemo(() => {
    if (isTablet) {
      return 0;
    }
    return numberingObj ? 110 : 88;
  }, [numberingObj]);

  return (
    <View
      style={[
        styles.stationNameContainer,
        {
          paddingBottom,
        },
      ]}
    >
      <View
        style={
          isEn || includesLongStationName
            ? {
                transform: [{ rotate: '-55deg' }],
              }
            : {}
        }
      >
        <StationName
          station={stationInLoop}
          en={isEn}
          horizontal={includesLongStationName}
          passed={passed}
          hasNumbering={!!numberingObj}
        />
      </View>
      {numberingObj ? (
        <View
          style={[
            styles.numberingContainer,
            {
              backgroundColor: stationNumberBGColor,
              marginBottom: passed && isTablet ? -4 : -6,
            },
          ]}
        >
          <Typography
            style={[styles.numberingText, { color: stationNumberTextColor }]}
          >
            {stationNumberString}
          </Typography>
        </View>
      ) : null}

      <StationDotIndicators
        passed={passed}
        arrived={arrived}
        currentStationIndex={currentStationIndex}
        index={index}
        lineMarks={lineMarks}
        hasPassStationInRegion={hasPassStationInRegion}
        stations={stations}
        transferLines={transferLines}
        station={stationInLoop}
      />
    </View>
  );
};

const LineBoardWest: React.FC<Props> = ({ stations, lineColors }: Props) => {
  const { selectedLine } = useAtomValue(lineState);
  const { arrived, approaching } = useAtomValue(stationState);
  const barWidth = useBarWidth();
  const dim = useWindowDimensions();

  const isPassing = useIsPassing();
  const currentLine = useCurrentLine();

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const stationNameCellForMap = useCallback(
    (s: Station, i: number): React.ReactNode => (
      <StationNameCell
        key={s.id}
        station={s}
        stations={stations}
        arrived={!isPassing && !approaching && arrived}
        index={i}
        line={line ?? null}
      />
    ),
    [approaching, arrived, isPassing, line, stations]
  );

  const emptyArray = useMemo(() => {
    const gap = Math.max(0, 8 - lineColors.length);
    const last = lineColors.at(-1);
    return Array.from({ length: gap }, () => last) as (
      | string
      | null
      | undefined
    )[];
  }, [lineColors]);

  const stationsWithEmpty = useMemo(
    () => [...lineColors, ...emptyArray],
    [emptyArray, lineColors]
  );

  if (!line) {
    return null;
  }

  return (
    <View style={styles.root}>
      {stationsWithEmpty.map((lc, i) => (
        <View
          key={`${lc}${i.toString()}`}
          style={[
            styles.bar,
            {
              left: barWidth * i,
              backgroundColor: lc ?? line?.color ?? '#000',
              width: barWidth,
            },
          ]}
        />
      ))}

      <View
        style={[
          styles.barTerminal,
          {
            borderBottomColor: line.color
              ? lineColors.at(-1) || line.color
              : '#000',
            left: isTablet ? dim.width - 72 + 6 : dim.width - 48 + 6,
          },
        ]}
      />
      <View style={styles.stationNameWrapper}>
        {stations.map(stationNameCellForMap)}
      </View>
    </View>
  );
};

export default React.memo(LineBoardWest);
