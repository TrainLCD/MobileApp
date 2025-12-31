import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import {
  useCurrentLine,
  useInterval,
  useTransferLinesFromStation,
} from '~/hooks';
import { useScale } from '~/hooks/useScale';
import { isEnAtom } from '~/store/selectors/isEn';
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
  useIncludesLongStationName,
} from './LineBoard/shared/hooks/useBarStyles';
import { commonLineBoardStyles } from './LineBoard/shared/styles/commonStyles';
import NumberingIcon from './NumberingIcon';

type Props = {
  lineColors: (string | null | undefined)[];
  stations: Station[];
  hasTerminus: boolean;
};

// Local style overrides specific to JRKyushu
const localStyles = StyleSheet.create({
  numberingIconContainer: {
    position: 'absolute',
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
    bottom: isTablet ? 8 : 72,
    transform: [{ scale: 0.5 }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameCommon: {
    marginBottom: isTablet ? 45 : 90,
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
  chevronColor: 'BLUE' | 'BLACK' | 'WHITE';
}

// Helper: Determine if the bar should be split at current station
const useBarSplitConfig = (
  currentStationIndex: number,
  index: number,
  stationsLength: number
) => {
  const isSplitPosition = useMemo(
    () =>
      currentStationIndex !== 0 &&
      currentStationIndex === index &&
      currentStationIndex !== stationsLength - 1,
    [currentStationIndex, index, stationsLength]
  );

  return { isSplitPosition };
};

// Helper: Calculate bar style properties
const useBarStyleProps = (
  barLeft: number,
  barWidth: number,
  isSplitPosition: boolean,
  isSecondHalf: boolean
) => {
  return useMemo(() => {
    if (!isSplitPosition) {
      return { left: barLeft, width: barWidth };
    }

    const halfWidth = barWidth / 2.5;
    return {
      left: isSecondHalf ? barLeft + halfWidth : barLeft,
      width: halfWidth,
    };
  }, [barLeft, barWidth, isSplitPosition, isSecondHalf]);
};

// Custom hook: Extract station rendering state logic
const useStationRenderState = (
  station: Station,
  index: number,
  stations: Station[]
) => {
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

  const includesLongStationName = useIncludesLongStationName(stations);

  const showFutureBar = (arrived && currentStationIndex < index + 1) || !passed;
  const showChevron =
    (currentStationIndex < 1 && index === 0) || currentStationIndex === index;

  return {
    currentStationIndex,
    arrived,
    passed,
    shouldGrayscale,
    isEn,
    includesLongStationName,
    showFutureBar,
    showChevron,
  };
};

// Component: Render numbering icon if available
const NumberingIconView: React.FC<{ station: Station }> = ({ station }) => {
  const numberingObj = useMemo(
    () => station.stationNumbers?.[0],
    [station.stationNumbers]
  );

  if (!numberingObj?.lineSymbolShape || !numberingObj?.stationNumber) {
    return null;
  }

  return (
    <View style={styles.numberingIconContainer}>
      <NumberingIcon
        shape={numberingObj.lineSymbolShape}
        lineColor={numberingObj.lineSymbolColor || '#000'}
        stationNumber={numberingObj.stationNumber}
        threeLetterCode={station.threeLetterCode}
        transformOrigin="center"
      />
    </View>
  );
};

// Component: Render bar gradients
const BarGradients: React.FC<{
  line: Line;
  lineColors: (string | null | undefined)[];
  index: number;
  barLeft: number;
  barWidth: number;
  isSplitPosition: boolean;
  arrived: boolean;
  showFutureBar: boolean;
  firstHalfBarProps: { left: number; width: number };
  secondHalfBarProps: { left: number; width: number };
}> = ({
  line,
  lineColors,
  index,
  barLeft,
  barWidth,
  isSplitPosition,
  arrived,
  showFutureBar,
  firstHalfBarProps,
  secondHalfBarProps,
}) => (
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

    {showFutureBar ? (
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={[styles.bar, { left: barLeft, width: barWidth }]}
      />
    ) : null}

    {arrived && isSplitPosition ? (
      <LinearGradient
        colors={line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb']}
        style={[styles.bar, firstHalfBarProps]}
      />
    ) : null}

    {showFutureBar ? (
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
          isSplitPosition
            ? secondHalfBarProps
            : { left: barLeft, width: barWidth },
        ]}
      />
    ) : null}
  </>
);

const StationNameCell: React.FC<StationNameCellProps> = ({
  station,
  index,
  stations,
  line,
  lineColors,
  hasTerminus,
  chevronColor,
}: StationNameCellProps) => {
  const dim = useWindowDimensions();
  const {
    currentStationIndex,
    arrived,
    passed,
    shouldGrayscale,
    isEn,
    includesLongStationName,
    showFutureBar,
    showChevron,
  } = useStationRenderState(station, index, stations);

  const transferLines = useTransferLinesFromStation(station, {
    omitJR: true,
    omitRepeatingLine: true,
  });

  const { left: barLeft, width: barWidth } = useBarStyles({ index });
  const { widthScale } = useScale();
  const additionalChevronStyle = useChevronPosition(index, arrived, passed);
  const { isSplitPosition } = useBarSplitConfig(
    currentStationIndex,
    index,
    stations.length
  );

  const firstHalfBarProps = useBarStyleProps(
    barLeft,
    barWidth,
    isSplitPosition,
    false
  );
  const secondHalfBarProps = useBarStyleProps(
    barLeft,
    barWidth,
    isSplitPosition,
    true
  );

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

        <NumberingIconView station={station} />

        <BarGradients
          line={line}
          lineColors={lineColors}
          index={index}
          barLeft={barLeft}
          barWidth={barWidth}
          isSplitPosition={isSplitPosition}
          arrived={arrived}
          showFutureBar={showFutureBar}
          firstHalfBarProps={firstHalfBarProps}
          secondHalfBarProps={secondHalfBarProps}
        />

        <LineDot
          station={station}
          shouldGrayscale={shouldGrayscale}
          transferLines={transferLines}
          arrived={arrived}
          passed={passed}
        />

        {stations.length - 1 === index ? (
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
            marginLeft: widthScale(14),
          },
        ]}
      >
        {showChevron ? <ChevronTY color={chevronColor} /> : null}
      </View>
    </>
  );
};

const LineBoardJRKyushu: React.FC<Props> = ({
  stations,
  hasTerminus,
  lineColors,
}: Props) => {
  const [chevronColor, setChevronColor] = useState<'BLUE' | 'BLACK'>('BLACK');
  const { selectedLine } = useAtomValue(lineState);
  const currentLine = useCurrentLine();
  const dim = useWindowDimensions();
  const padCount = Math.max(0, 8 - stations.length);
  const totalStations = stations.length + padCount;

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const intervalStep = useCallback(
    () => setChevronColor((prev) => (prev === 'BLUE' ? 'BLACK' : 'BLUE')),
    []
  );

  useInterval(intervalStep, 1000);

  const stationNameCellForMap = useCallback(
    (s: Station | undefined, i: number): React.ReactNode | null => {
      const isLast = totalStations - 1 === i;

      if (!s) {
        return (
          <EmptyStationNameCell
            lastLineColor={lineColors.at(-1) || line?.color || '#fff'}
            key={`empty-${i}`}
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
    [chevronColor, hasTerminus, line, lineColors, stations, totalStations]
  );

  const stationsWithEmpty = useMemo(
    () =>
      [
        ...stations,
        ...Array.from<Station | undefined>({ length: padCount }),
      ] as (Station | undefined)[],
    [padCount, stations]
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

export default React.memo(LineBoardJRKyushu);
