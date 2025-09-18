import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Line, Station } from '~/gen/proto/stationapi_pb';
import { useScale } from '~/hooks/useScale';
import {
  useCurrentLine,
  useInterval,
  useTransferLinesFromStation,
} from '../hooks';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import { isEnAtom } from '../store/selectors/isEn';
import getStationNameR from '../utils/getStationNameR';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import { BarTerminalSaikyo } from './BarTerminalSaikyo';
import { ChevronTY } from './ChervronTY';
import PadLineMarks from './PadLineMarks';
import PassChevronTY from './PassChevronTY';
import Typography from './Typography';

const useBarStyles = ({
  index,
}: {
  index?: number;
}): { left: number; width: number } => {
  const { widthScale } = useScale();

  const left = useMemo(() => {
    if (index === 0) {
      return widthScale(-32);
    }
    return widthScale(-20);
  }, [index, widthScale]);

  const width = useMemo(() => {
    if (isTablet) {
      if (index === 0) {
        return widthScale(200);
      }
      if (index === 1) {
        return widthScale(61.75);
      }
    }
    return widthScale(62);
  }, [index, widthScale]);
  return { left, width };
};
interface Props {
  lineColors: (string | null | undefined)[];
  stations: Station[];
  hasTerminus: boolean;
}

const styles = StyleSheet.create({
  root: {
    height: '100%',
    flexDirection: 'row',
    justifyContent: isTablet ? 'flex-start' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  bar: {
    position: 'absolute',
    bottom: isTablet ? -52 : 32,
    height: isTablet ? 48 : 32,
  },
  barTerminal: {
    position: 'absolute',
  },
  stationNameContainer: {
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 84 : undefined,
    width: `${100 / 9}%`,
  },
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
  },
  chevronGradient: {
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
  },
  marksContainer: { top: 38, position: 'absolute' },
  nameCommon: {
    marginBottom: isTablet ? undefined : 64,
  },
  longOrEnName: {
    flex: 1,
    width: '100%',
    marginLeft: isTablet ? -24 : -16,
    justifyContent: 'flex-end',
  },
  jaName: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
interface StationNameProps {
  station: Station;
  en?: boolean;
  horizontal?: boolean;
  passed?: boolean;
}

interface StationNameCellProps {
  station: Station;
  index: number;
  stations: Station[];
  line: Line | null;
  lineColors: (string | null | undefined)[];
  hasTerminus: boolean;
  chevronColor: 'RED' | 'BLUE' | 'WHITE';
}

type LineDotProps = {
  station: Station;
  currentStationIndex: number;
  index: number;
  shouldGrayscale: boolean;
  transferLines: Line[];
  arrived: boolean;
  passed: boolean;
};

const LineDot: React.FC<LineDotProps> = ({
  station,
  shouldGrayscale,
  transferLines,
  arrived,
  passed,
}) => {
  const { widthScale } = useScale();

  if (getIsPass(station)) {
    return (
      <View style={styles.stationArea}>
        <View
          style={[
            styles.chevronAreaPass,
            {
              marginLeft: isTablet ? 0 : widthScale(5),
            },
          ]}
        >
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
    );
  }

  return (
    <View style={styles.stationArea}>
      <View style={styles.chevronArea}>
        <LinearGradient
          style={styles.chevronGradient}
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
  );
};

const StationName: React.FC<StationNameProps> = ({
  station,
  en,
  horizontal,
  passed,
}: StationNameProps) => {
  const stationNameR = useMemo(() => getStationNameR(station), [station]);
  const dim = useWindowDimensions();

  const horizontalAditionalStyle = useMemo(
    () => ({
      width: isTablet ? dim.height / 3.5 : dim.height / 2.5,
      marginBottom: isTablet ? dim.height / 10 : dim.height / 6,
    }),
    [dim.height]
  );

  if (en) {
    return (
      <Typography
        style={[
          styles.stationNameHorizontal,
          passed ? styles.grayColor : null,
          horizontalAditionalStyle,
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
          styles.stationNameHorizontal,
          passed ? styles.grayColor : null,
          horizontalAditionalStyle,
        ]}
      >
        {station.name}
      </Typography>
    );
  }
  return (
    <View style={styles.stationNameMapContainer}>
      {station.name.split('').map((c, j) => (
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

const StationNameCell: React.FC<StationNameCellProps> = ({
  station,
  // index === 0: 残り駅が8駅以上あるので画面の端にchevronがある
  index,
  stations,
  line,
  lineColors,
  hasTerminus,
  chevronColor,
}: StationNameCellProps) => {
  const { station: currentStation, arrived } = useAtomValue(stationState);
  const isEn = useAtomValue(isEnAtom);
  const dim = useWindowDimensions();

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

  const { left: barLeft, width: barWidth } = useBarStyles({
    index,
  });
  const { widthScale } = useScale();

  const additionalChevronStyle = useMemo(() => {
    // 最初の駅の場合
    if (!index) {
      return arrived ? { left: widthScale(-14) } : null;
    }

    // 到着済みの場合
    if (arrived) {
      return {
        left: widthScale(41.57 * index) - widthScale(14),
      };
    }

    // 通過していない場合
    if (!passed) {
      return {
        left: widthScale(arrived ? 45 : 42 * index),
      };
    }

    // デフォルト（通過済み）
    return {
      left: widthScale(42 * index),
    };
  }, [arrived, index, passed, widthScale]);

  const includesLongStationName = useMemo(
    () =>
      !!stations.filter((s) => s.name.includes('ー') || s.name.length > 6)
        .length,
    [stations]
  );

  return (
    <>
      <View style={styles.stationNameContainer}>
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
        <LinearGradient
          colors={['#fff', '#000', '#000']}
          locations={[0.1, 0.5, 0.9]}
          style={[
            styles.bar,
            {
              left: barLeft,
              width: barWidth,
            },
          ]}
        />
        <LinearGradient
          colors={
            line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb']
          }
          style={[
            styles.bar,
            {
              left: barLeft,
              width: barWidth,
            },
          ]}
        />
        {(arrived && currentStationIndex < index + 1) || !passed ? (
          <LinearGradient
            colors={['#fff', '#000', '#000']}
            locations={[0.1, 0.5, 0.9]}
            style={[
              styles.bar,
              {
                left: barLeft,
                width: barWidth,
              },
            ]}
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
            style={[
              styles.bar,
              {
                left: barLeft,
                width: barWidth / 2.5,
              },
            ]}
          />
        ) : null}
        {(arrived && currentStationIndex < index + 1) || !passed ? (
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
              },
            ]}
          />
        ) : null}
        <LineDot
          station={station}
          currentStationIndex={currentStationIndex}
          index={index}
          shouldGrayscale={shouldGrayscale}
          transferLines={transferLines}
          arrived={arrived}
          passed={passed}
        />
        {stations.length - 1 === index ? (
          <BarTerminalSaikyo
            width={isTablet ? 41.57 : 27.33}
            height={isTablet ? 48 : 32}
            style={[
              styles.barTerminal,
              {
                left: barLeft + barWidth,
                bottom: isTablet ? -52 : 32,
              },
            ]}
            lineColor={
              line?.color
                ? lineColors[lineColors.length - 1] || line.color
                : '#000'
            }
            hasTerminus={hasTerminus}
          />
        ) : null}
      </View>
      <View
        style={[
          styles.chevron,
          additionalChevronStyle,
          {
            marginLeft: widthScale(14),
            bottom: isTablet ? dim.height / 3.5 + 32 : 32,
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

const LineBoardSaikyo: React.FC<Props> = ({
  stations,
  hasTerminus,
  lineColors,
}: Props) => {
  const [chevronColor, setChevronColor] = useState<'RED' | 'WHITE'>('RED');
  const { selectedLine } = useAtomValue(lineState);
  const currentLine = useCurrentLine();
  const dim = useWindowDimensions();

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const intervalStep = useCallback(
    () => setChevronColor((prev) => (prev === 'RED' ? 'WHITE' : 'RED')),
    []
  );

  useInterval(intervalStep, 1000);

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

export default React.memo(LineBoardSaikyo);
