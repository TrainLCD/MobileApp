import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import {
  type StyleProp,
  type TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import type { Line, Station, StationNumber } from '~/@types/graphql';
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
import { ChevronJRWest } from './ChevronJRWest';
import { useIncludesLongStationName } from './LineBoard/shared/hooks/useBarStyles';
import { commonLineBoardStyles } from './LineBoard/shared/styles/commonStyles';
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

const styles = commonLineBoardStyles;

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
          style={[styles.stationNameWest, passed ? styles.grayColor : null]}
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
      style={[
        styles.lineDotWest,
        { backgroundColor: passed ? '#aaa' : '#fff' },
      ]}
    >
      {showTopBar ? <View style={styles.topBarWest} /> : null}

      {showArrivedDot ? <View style={styles.arrivedLineDotWest} /> : null}

      <View
        style={[
          styles.chevronWest,
          lineMarks.length ? undefined : { marginTop: isTablet ? 8 : 2 },
        ]}
      >
        {showChevron ? <ChevronJRWest /> : null}
      </View>

      {showPassMark ? (
        <View
          style={[styles.passMarkWest, { backgroundColor: passMarkBgColor }]}
        />
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
  const { width: windowWidth } = useWindowDimensions();

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
    nextStation
  );

  const includesLongStationName = useIncludesLongStationName(stations);

  const paddingBottom = useMemo(() => {
    if (isTablet) {
      return 0;
    }
    return numberingObj ? 110 : 88;
  }, [numberingObj]);

  return (
    <View
      style={[
        styles.stationNameContainerWestJO,
        {
          paddingBottom,
          width: windowWidth / 9,
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
            styles.numberingContainerWest,
            {
              backgroundColor: stationNumberBGColor,
              marginBottom: passed && isTablet ? -4 : -6,
            },
          ]}
        >
          <Typography
            style={[
              styles.numberingTextWest,
              { color: stationNumberTextColor },
            ]}
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
    <View style={styles.rootWestJO}>
      {stationsWithEmpty.map((lc, i) => (
        <View
          key={`${lc}${i.toString()}`}
          style={[
            styles.barWest,
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
          styles.barTerminalWest,
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
