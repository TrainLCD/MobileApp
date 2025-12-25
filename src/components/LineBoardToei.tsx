import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Line, Station, StationNumber } from '~/@types/graphql';
import {
  useCurrentLine,
  useInterval,
  useStationNumberIndexFunc,
  useTransferLinesFromStation,
} from '~/hooks';
import { useScale } from '~/hooks/useScale';
import { isEnAtom } from '~/store/selectors/isEn';
import { RFValue } from '~/utils/rfValue';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import { BarTerminalEast } from './BarTerminalEast';
import { ChevronTY } from './ChevronTY';
import {
  EmptyStationNameCell,
  LineDot,
  StationName,
} from './LineBoard/shared/components';
import {
  useBarStyles,
  useChevronPosition,
} from './LineBoard/shared/hooks/useBarStyles';
import { commonLineBoardStyles } from './LineBoard/shared/styles/commonStyles';
import Typography from './Typography';

type Props = {
  lineColors: (string | null | undefined)[];
  stations: Station[];
  hasTerminus: boolean;
};

const localStyles = StyleSheet.create({
  splittedStationName: {
    marginLeft: 1,
  },
  stationNameExtra: {
    fontSize: RFValue(10),
    fontWeight: 'bold',
  },
  splittedStationNameWithExtraLang: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  stationNumber: {
    width: isTablet ? 60 : 45,
    fontSize: RFValue(12),
    fontWeight: 'bold',
    marginLeft: -5,
    bottom: isTablet ? 0 : 64,
    textAlign: 'center',
  },
});

const styles = { ...commonLineBoardStyles, ...localStyles };

interface StationNameCellProps {
  station: Station;
  index: number;
  stations: Station[];
  line: Line;
  lineColors: (string | null | undefined)[];
  hasTerminus: boolean;
  chevronColor: 'RED' | 'BLUE' | 'WHITE';
}

// Helper: Check if station is at middle position
const isMiddleStation = (
  currentStationIndex: number,
  index: number,
  stationsLength: number
): boolean => {
  return (
    currentStationIndex !== 0 &&
    currentStationIndex === index &&
    currentStationIndex !== stationsLength - 1
  );
};

// Helper: Render background bar gradients
const BackgroundBars: React.FC<{
  line: Line;
  barLeft: number;
  barWidth: number;
}> = ({ line, barLeft, barWidth }) => (
  <>
    <LinearGradient
      colors={['#fff', '#000', '#000', '#fff']}
      locations={[0.5, 0.5, 0.5, 0.9]}
      style={[styles.bar, { left: barLeft, width: barWidth }]}
    />
    <LinearGradient
      colors={line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb']}
      style={[styles.bar, { left: barLeft, width: barWidth }]}
    />
  </>
);

// Helper: Render future/upcoming station bars
const FutureBars: React.FC<{
  arrived: boolean;
  currentStationIndex: number;
  index: number;
  passed: boolean;
  line: Line;
  lineColors: (string | null | undefined)[];
  barLeft: number;
  barWidth: number;
  stations: Station[];
}> = ({
  arrived,
  currentStationIndex,
  index,
  passed,
  line,
  lineColors,
  barLeft,
  barWidth,
  stations,
}) => {
  const shouldRender = (arrived && currentStationIndex < index + 1) || !passed;
  if (!shouldRender) {
    return null;
  }

  const isMiddle = isMiddleStation(currentStationIndex, index, stations.length);

  return (
    <>
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={[styles.bar, { left: barLeft, width: barWidth }]}
      />
      <LinearGradient
        colors={
          line.color
            ? [
                `${lineColors[index] || line.color}ff`,
                `${lineColors[index] || line.color}bb`,
              ]
            : ['#000000ff', '#000000bb']
        }
        style={[
          styles.bar,
          {
            left: isMiddle ? barLeft + barWidth / 2.5 : barLeft,
            width: isMiddle ? barWidth / 2.5 : barWidth,
          },
        ]}
      />
    </>
  );
};

// Helper: Render middle station bar (half-bar for current station)
const MiddleStationBar: React.FC<{
  arrived: boolean;
  currentStationIndex: number;
  index: number;
  stations: Station[];
  line: Line;
  barLeft: number;
  barWidth: number;
}> = ({
  arrived,
  currentStationIndex,
  index,
  stations,
  line,
  barLeft,
  barWidth,
}) => {
  if (
    !arrived ||
    !isMiddleStation(currentStationIndex, index, stations.length)
  ) {
    return null;
  }

  return (
    <LinearGradient
      colors={line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb']}
      style={[styles.bar, { left: barLeft, width: barWidth / 2.5 }]}
    />
  );
};

const StationNameCell: React.FC<StationNameCellProps> = ({
  station,
  index,
  stations,
  line,
  lineColors,
  hasTerminus,
  chevronColor,
}: StationNameCellProps) => {
  const { station: currentStation, arrived } = useAtomValue(stationState);
  const isEn = useAtomValue(isEnAtom);

  const currentStationIndex = useMemo(
    () => stations.findIndex((s) => s.groupId === currentStation?.groupId),
    [currentStation?.groupId, stations]
  );

  const passed = useMemo(
    () => index <= currentStationIndex || (!index && !arrived),
    [arrived, currentStationIndex, index]
  );
  const shouldGrayscale = useMemo(
    () =>
      getIsPass(station) ||
      (arrived && currentStationIndex === index ? false : passed),
    [arrived, currentStationIndex, index, passed, station]
  );

  const transferLines = useTransferLinesFromStation(station, {
    omitJR: true,
    omitRepeatingLine: true,
  });

  const { left: barLeft, width: barWidth } = useBarStyles({ index });
  const { widthScale } = useScale();
  const additionalChevronStyle = useChevronPosition(index, arrived, passed);

  const includesLongStationName = useMemo(
    () =>
      !!stations.filter(
        (s) => s.name?.includes('ー') || (s.name?.length ?? 0) > 6
      ).length,
    [stations]
  );

  const dim = useWindowDimensions();
  const getStationNumberIndex = useStationNumberIndexFunc();
  const stationNumberIndex = useMemo(
    () => getStationNumberIndex(currentStation),
    [currentStation, getStationNumberIndex]
  );
  const numberingObj = useMemo<StationNumber | undefined>(
    () => station.stationNumbers?.[stationNumberIndex],
    [station.stationNumbers, stationNumberIndex]
  );

  const isLastStation = stations.length - 1 === index;
  const shouldShowChevron =
    (currentStationIndex < 1 && index === 0) || currentStationIndex === index;

  return (
    <>
      <View style={[styles.stationNameContainer, { width: dim.width / 9 }]}>
        <View
          style={[
            styles.nameCommon,
            isEn || includesLongStationName
              ? styles.longOrEnName
              : styles.jaName,
          ]}
        >
          <StationName
            station={station}
            en={isEn}
            horizontal={includesLongStationName}
            passed={getIsPass(station) || shouldGrayscale}
          />
        </View>
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
        <BackgroundBars line={line} barLeft={barLeft} barWidth={barWidth} />
        <FutureBars
          arrived={arrived}
          currentStationIndex={currentStationIndex}
          index={index}
          passed={passed}
          line={line}
          lineColors={lineColors}
          barLeft={barLeft}
          barWidth={barWidth}
          stations={stations}
        />
        <MiddleStationBar
          arrived={arrived}
          currentStationIndex={currentStationIndex}
          index={index}
          stations={stations}
          line={line}
          barLeft={barLeft}
          barWidth={barWidth}
        />
        <LineDot
          station={station}
          shouldGrayscale={shouldGrayscale}
          transferLines={transferLines}
          arrived={arrived}
          passed={passed}
        />
        {isLastStation ? (
          <BarTerminalEast
            width={isTablet ? 41 : 27}
            height={isTablet ? 48 : 32}
            style={[
              styles.barTerminal,
              {
                left: barLeft + barWidth,
                bottom: isTablet ? -52 : 32,
              },
            ]}
            lineColor={line.color ? lineColors.at(-1) || line.color : '#000'}
            hasTerminus={hasTerminus}
          />
        ) : null}
      </View>
      <View
        style={[
          styles.chevron,
          additionalChevronStyle,
          {
            bottom: isTablet ? dim.height / 3.5 + 32 : 32,
            marginLeft: widthScale(15),
          },
        ]}
      >
        {shouldShowChevron ? <ChevronTY color={chevronColor} /> : null}
      </View>
    </>
  );
};

const LineBoardToei: React.FC<Props> = ({
  stations,
  hasTerminus,
  lineColors,
}: Props) => {
  const [chevronColor, setChevronColor] = useState<'RED' | 'BLUE'>('BLUE');
  const { selectedLine } = useAtomValue(lineState);
  const currentLine = useCurrentLine();

  const dim = useWindowDimensions();

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const intervalStep = useCallback(
    () => setChevronColor((prev) => (prev === 'RED' ? 'BLUE' : 'RED')),
    []
  );

  useInterval(intervalStep, 1000);

  const stationNameCellForMap = useCallback(
    (s: Station, i: number): React.ReactNode | null => {
      const isLast =
        [...stations, ...Array.from({ length: 8 - stations.length })].length -
          1 ===
        i;

      if (!s) {
        return (
          <EmptyStationNameCell
            lastLineColor={lineColors.at(-1) || line?.color || '#fff'}
            key={i}
            isLast={isLast}
            hasTerminus={hasTerminus}
          />
        );
      }

      if (!line) {
        return null;
      }

      return (
        <React.Fragment key={s.id}>
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
      );
    },
    [chevronColor, hasTerminus, line, lineColors, stations]
  );

  const stationsWithEmpty = useMemo(
    () =>
      [
        ...stations,
        ...Array.from({ length: 8 - stations.length }),
      ] as Station[],
    [stations]
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingBottom: isTablet ? dim.height / 3.5 : undefined,
        },
      ]}
    >
      {stationsWithEmpty.map(stationNameCellForMap)}
    </View>
  );
};

export default React.memo(LineBoardToei);
