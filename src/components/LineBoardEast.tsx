import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
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
import { commonLineBoardStyles as styles } from './LineBoard/shared/styles/commonStyles';

type Props = {
  lineColors: (string | null | undefined)[];
  stations: Station[];
  hasTerminus: boolean;
};

interface StationNameCellProps {
  station: Station;
  index: number;
  stations: Station[];
  line: Line;
  lineColors: (string | null | undefined)[];
  hasTerminus: boolean;
  chevronColor: 'RED' | 'BLUE' | 'WHITE';
}

// Helper for bar gradients
const shouldShowSecondaryBar = (
  arrived: boolean,
  currentStationIndex: number,
  index: number,
  passed: boolean
) => (arrived && currentStationIndex < index + 1) || !passed;

const isSplitAtCurrentStation = (
  arrived: boolean,
  currentStationIndex: number,
  index: number,
  stations: Station[]
) =>
  arrived &&
  currentStationIndex !== 0 &&
  currentStationIndex === index &&
  currentStationIndex !== stations.length - 1;

const getMainBarColors = (line?: Line): readonly [string, string] =>
  line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb'];

const getLineBarColors = (
  line: Line,
  lineColors: (string | null | undefined)[],
  index: number
): readonly [string, string] => {
  const base = lineColors[index] || line.color;
  return base ? [`${base}ff`, `${base}bb`] : ['#000000ff', '#000000bb'];
};

const createBarGradient = (
  key: string,
  colors: readonly [string, string, ...string[]],
  left: number,
  width: number,
  extra?: Partial<React.ComponentProps<typeof LinearGradient>>
) => (
  <LinearGradient
    key={key}
    colors={colors}
    {...extra}
    style={[
      styles.bar,
      {
        left,
        width,
      },
    ]}
  />
);

const renderBarGradients = ({
  barLeft,
  barWidth,
  line,
  lineColors,
  index,
  arrived,
  currentStationIndex,
  stations,
  passed,
}: {
  barLeft: number;
  barWidth: number;
  line: Line;
  lineColors: (string | null | undefined)[];
  index: number;
  arrived: boolean;
  currentStationIndex: number;
  stations: Station[];
  passed: boolean;
}) => {
  const secondaryVisible = shouldShowSecondaryBar(
    arrived,
    currentStationIndex,
    index,
    passed
  );
  const splitHere = isSplitAtCurrentStation(
    arrived,
    currentStationIndex,
    index,
    stations
  );

  const gradients = [
    createBarGradient(
      'bar-bg',
      ['#fff', '#000', '#000', '#fff'],
      barLeft,
      barWidth,
      {
        locations: [0.5, 0.5, 0.5, 0.9],
      }
    ),
    createBarGradient('bar-main', getMainBarColors(line), barLeft, barWidth),
  ];

  if (secondaryVisible) {
    gradients.push(
      createBarGradient(
        'bar-bg-2',
        ['#fff', '#000', '#000', '#fff'],
        barLeft,
        barWidth,
        {
          locations: [0.5, 0.5, 0.5, 0.9],
        }
      )
    );
  }

  if (splitHere) {
    gradients.push(
      createBarGradient(
        'bar-main-half',
        getMainBarColors(line),
        barLeft,
        barWidth / 2.5
      )
    );
  }

  if (secondaryVisible) {
    const left = splitHere ? barLeft + barWidth / 2.5 : barLeft;
    const width = splitHere ? barWidth / 2.5 : barWidth;
    gradients.push(
      createBarGradient(
        'bar-color',
        getLineBarColors(line, lineColors, index),
        left,
        width
      )
    );
  }

  return gradients;
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
  const includesLongStationName = useIncludesLongStationName(stations);

  const dim = useWindowDimensions();

  return (
    <>
      <View
        style={[
          styles.stationNameContainer,
          {
            width: dim.width / 9,
          },
        ]}
      >
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
        {renderBarGradients({
          barLeft,
          barWidth,
          line,
          lineColors,
          index,
          arrived,
          currentStationIndex,
          stations,
          passed,
        })}
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
        {(currentStationIndex < 1 && index === 0) ||
        currentStationIndex === index ? (
          <ChevronTY color={chevronColor} />
        ) : null}
      </View>
    </>
  );
};

const LineBoardEast: React.FC<Props> = ({
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

export default React.memo(LineBoardEast);
