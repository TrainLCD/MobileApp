import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import {
  useCurrentLine,
  useDisplayCurrentStation,
  useLandscapeWindowDimensions,
  useTransferLinesFromStation,
} from '~/hooks';
import { useScale } from '~/hooks/useScale';
import { arrivedAtom } from '~/store/atoms/station';
import { isEnAtom } from '~/store/selectors/isEn';
import { RFValue } from '~/utils/rfValue';
import { selectedLineAtom } from '../store/atoms/line';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import { BarTerminalSaikyo } from './BarTerminalSaikyo';
import {
  BlinkingChevron,
  LineDot,
  StationName,
} from './LineBoard/shared/components';
import {
  useBarStyles,
  useChevronPosition,
  useIncludesLongStationName,
} from './LineBoard/shared/hooks/useBarStyles';
import {
  commonLineBoardStyles,
  STATION_NAME_CONTAINER_BOTTOM,
} from './LineBoard/shared/styles/commonStyles';

interface Props {
  lineColors: (string | null | undefined)[];
  stations: Station[];
  hasTerminus: boolean;
}

// Local style overrides specific to Saikyo
const localStyles = StyleSheet.create({
  stationNameMapContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  stationName: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#3a3a3a',
    marginLeft: 5,
    marginBottom: Platform.select({ android: -6, ios: 0 }),
  },
  stationNameHorizontal: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    transform: [{ rotate: '-55deg' }],
    color: '#3a3a3a',
  },
  chevron: {
    position: 'absolute',
    zIndex: 9999,
    width: isTablet ? 48 : 32,
    height: isTablet ? 48 : 32,
    marginTop: isTablet ? -6 : -4,
  },
});

const styles = { ...commonLineBoardStyles, ...localStyles };

interface StationNameCellProps {
  station: Station;
  index: number;
  stations: Station[];
  line: Line | null;
  lineColors: (string | null | undefined)[];
  hasTerminus: boolean;
}

const useStationCellState = (
  station: Station,
  index: number,
  stations: Station[]
) => {
  const arrived = useAtomValue(arrivedAtom);
  // 現在地基準の現在駅(到着取りこぼし時はヘッダーの「まもなく」と一致する側へ自己修復)
  const currentStation = useDisplayCurrentStation();
  const transferLines = useTransferLinesFromStation(station, {
    omitJR: true,
    omitRepeatingLine: true,
  });

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

  return {
    currentStationIndex,
    passed,
    shouldGrayscale,
    transferLines,
    arrived,
  };
};

const isAtMidStation = (
  currentStationIndex: number,
  index: number,
  stationsLength: number
): boolean =>
  currentStationIndex !== 0 &&
  currentStationIndex === index &&
  currentStationIndex !== stationsLength - 1;

const BarGradients: React.FC<{
  line: Line | null;
  lineColors: (string | null | undefined)[];
  index: number;
  barLeft: number;
  barWidth: number;
  currentStationIndex: number;
  stations: Station[];
  arrived: boolean;
  passed: boolean;
}> = ({
  line,
  lineColors,
  index,
  barLeft,
  barWidth,
  currentStationIndex,
  stations,
  arrived,
  passed,
}) => {
  const showFutureBar = (arrived && currentStationIndex < index + 1) || !passed;
  const isMidStation = isAtMidStation(
    currentStationIndex,
    index,
    stations.length
  );

  return (
    <>
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={[styles.bar, { left: barLeft, width: barWidth }]}
      />
      <LinearGradient
        colors={line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb']}
        style={[styles.bar, { left: barLeft, width: barWidth }]}
      />
      {showFutureBar && (
        <LinearGradient
          colors={['#fff', '#000', '#000']}
          locations={[0.1, 0.5, 0.9]}
          style={[styles.bar, { left: barLeft, width: barWidth }]}
        />
      )}
      {arrived && isMidStation && (
        <LinearGradient
          colors={
            line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb']
          }
          style={[styles.bar, { left: barLeft, width: barWidth / 2.5 }]}
        />
      )}
      {showFutureBar && (
        <LinearGradient
          colors={
            line?.color
              ? [
                  `${lineColors[index] || line.color}ff`,
                  `${lineColors[index] || line.color}bb`,
                ]
              : ['#000000ff', '#000000bb']
          }
          style={[
            styles.bar,
            {
              left: isMidStation ? barLeft + barWidth / 2.5 : barLeft,
              width: isMidStation ? barWidth / 2.5 : barWidth,
            },
          ]}
        />
      )}
    </>
  );
};

// 旧実装の点滅順(初期=RED、次=WHITE)を保つ
const SAIKYO_CHEVRON_COLORS = ['RED', 'WHITE'] as const;

const StationNameCellBase: React.FC<StationNameCellProps> = ({
  station,
  index,
  stations,
  line,
  lineColors,
  hasTerminus,
}: StationNameCellProps) => {
  const isEn = useAtomValue(isEnAtom);
  const dim = useLandscapeWindowDimensions();
  const { widthScale } = useScale();
  const { left: barLeft, width: barWidth } = useBarStyles({ index });

  const {
    currentStationIndex,
    passed,
    shouldGrayscale,
    transferLines,
    arrived,
  } = useStationCellState(station, index, stations);

  const additionalChevronStyle = useChevronPosition(index, arrived, passed);
  const includesLongStationName = useIncludesLongStationName(stations);

  const showChevron =
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
            passed={shouldGrayscale}
          />
        </View>
        <BarGradients
          line={line}
          lineColors={lineColors}
          index={index}
          barLeft={barLeft}
          barWidth={barWidth}
          currentStationIndex={currentStationIndex}
          stations={stations}
          arrived={arrived}
          passed={passed}
        />
        <LineDot
          station={station}
          shouldGrayscale={shouldGrayscale}
          transferLines={transferLines}
          arrived={arrived}
          passed={passed}
        />
        {stations.length - 1 === index && (
          <BarTerminalSaikyo
            width={isTablet ? 41 : 27}
            height={isTablet ? 48 : 32}
            style={[
              styles.barTerminal,
              { left: barLeft + barWidth, bottom: isTablet ? -52 : 32 },
            ]}
            lineColor={line?.color ? lineColors.at(-1) || line.color : '#000'}
            hasTerminus={hasTerminus}
          />
        )}
      </View>
      <View
        style={[
          styles.chevron,
          additionalChevronStyle,
          {
            marginLeft: widthScale(14),
            bottom: isTablet
              ? dim.height / 3.5 + (STATION_NAME_CONTAINER_BOTTOM ?? 0) - 52
              : 32,
          },
        ]}
      >
        {showChevron && <BlinkingChevron colors={SAIKYO_CHEVRON_COLORS} />}
      </View>
    </>
  );
};

// 点滅チェブロンを分離したことでセルのpropsは駅データ変化時にしか変わらないため、
// memo化により毎秒・毎tickの不要な再レンダーを防ぐ
const StationNameCell = React.memo(StationNameCellBase);

const LineBoardSaikyo: React.FC<Props> = ({
  stations,
  hasTerminus,
  lineColors,
}: Props) => {
  const selectedLine = useAtomValue(selectedLineAtom);
  const currentLine = useCurrentLine();
  const dim = useLandscapeWindowDimensions();

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const stationNameCellForMap = useCallback(
    (s: Station, i: number): React.ReactNode | null => {
      if (!s) {
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
          />
        </React.Fragment>
      );
    },
    [hasTerminus, line, lineColors, stations]
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

export default React.memo(LineBoardSaikyo);
