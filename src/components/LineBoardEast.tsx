import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import {
  useCurrentLine,
  useDisplayCurrentStation,
  useEstimateArrivalTimes,
  useEstimatedMinutesByStationId,
  useLandscapeWindowDimensions,
  useTransferLinesFromStation,
} from '~/hooks';
import { useAfterNextStation } from '~/hooks/useAfterNextStation';
import { useDisplayNextStation } from '~/hooks/useDisplayNextStation';
import { useScale } from '~/hooks/useScale';
import { arrivedAtom } from '~/store/atoms/station';
import { isEnAtom } from '~/store/selectors/isEn';
import { selectedLineAtom } from '../store/atoms/line';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import { BarTerminalEast } from './BarTerminalEast';
import { BarTerminalOdakyu } from './BarTerminalOdakyu';
import type { ChevronColor } from './ChevronTY';
import { Heading } from './Heading';
import {
  BlinkingChevron,
  EmptyStationNameCell,
  LineDot,
  StationName,
} from './LineBoard/shared/components';
import {
  useBarStyles,
  useChevronPosition,
  useIncludesLongStationName,
} from './LineBoard/shared/hooks/useBarStyles';
import {
  STATION_NAME_CONTAINER_BOTTOM,
  commonLineBoardStyles as styles,
} from './LineBoard/shared/styles/commonStyles';
import NumberingIcon from './NumberingIcon';

const localStyles = StyleSheet.create({
  numberingIconContainer: {
    position: 'absolute',
    width: isTablet ? 96 : 64,
    height: isTablet ? 96 : 64,
    bottom: isTablet ? -22 : 52,
    left: isTablet ? -24 : -16,
    transform: [{ scale: 0.5 }],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  nextStopBanner: {
    position: 'absolute',
    bottom: 0,
    left: '12.5%',
    right: '12.5%',
  },
  nextStopBannerText: {
    color: '#212121',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

const NumberingIconView: React.FC<{
  station: Station;
  shouldGrayscale: boolean;
}> = ({ station, shouldGrayscale }) => {
  const numberingObj = useMemo(
    () => station.stationNumbers?.[0],
    [station.stationNumbers]
  );

  if (!numberingObj?.lineSymbolShape || !numberingObj?.stationNumber) {
    return null;
  }

  return (
    <View style={localStyles.numberingIconContainer}>
      <NumberingIcon
        shape={numberingObj.lineSymbolShape}
        lineColor={numberingObj.lineSymbolColor || '#000'}
        stationNumber={numberingObj.stationNumber}
        threeLetterCode={station.threeLetterCode}
        transformOrigin="center"
        shouldGrayscale={shouldGrayscale}
      />
    </View>
  );
};

type Props = {
  lineColors: (string | null | undefined)[];
  stations: Station[];
  hasTerminus: boolean;
  chevronColorPair?: readonly [ChevronColor, ChevronColor];
  isOdakyu?: boolean;
};

interface StationNameCellProps {
  station: Station;
  index: number;
  stations: Station[];
  line: Line;
  lineColors: (string | null | undefined)[];
  hasTerminus: boolean;
  chevronColors: readonly [ChevronColor, ChevronColor];
  isOdakyu?: boolean;
  estimatedMinutes?: number | null;
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
  currentStationIndex === index &&
  currentStationIndex !== stations.length - 1;

const ODAKYU_HIGHLIGHT_OFFSET = 0.35;

const getMainBarColors = (line?: Line): readonly [string, string] =>
  line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb'];

const getLineBarColors = (
  line: Line,
  lineColors: (string | null | undefined)[],
  index: number
): readonly [string, string] => {
  const raw = lineColors[index] || line.color;
  return raw ? [`${raw}ff`, `${raw}bb`] : ['#000000ff', '#000000bb'];
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
  isOdakyu,
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
  isOdakyu?: boolean;
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

  const barHighlightOffset = isOdakyu ? ODAKYU_HIGHLIGHT_OFFSET : 0.5;

  const gradients = [
    createBarGradient(
      'bar-bg',
      ['#fff', '#000', '#000', '#fff'],
      barLeft,
      barWidth,
      {
        locations: [
          barHighlightOffset,
          barHighlightOffset,
          barHighlightOffset,
          0.9,
        ],
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
          locations: [
            barHighlightOffset,
            barHighlightOffset,
            barHighlightOffset,
            0.9,
          ],
        }
      )
    );
  }

  if (splitHere) {
    // index 0ではバー左端からドット中心までの距離を灰色幅に使う
    const dotCenterOffset = isTablet ? 24 : 16;
    const splitWidth =
      index === 0 ? Math.abs(barLeft) + dotCenterOffset : barWidth / 2.5;
    gradients.push(
      createBarGradient(
        'bar-main-half',
        getMainBarColors(line),
        barLeft,
        splitWidth
      )
    );
  }

  if (secondaryVisible) {
    const dotCenterOffset = isTablet ? 24 : 16;
    const splitWidth =
      index === 0 ? Math.abs(barLeft) + dotCenterOffset : barWidth / 2.5;
    const left = splitHere ? barLeft + splitWidth : barLeft;
    const width = splitHere ? barWidth - splitWidth : barWidth;
    gradients.push(
      createBarGradient(
        'bar-color',
        getLineBarColors(line, lineColors, index),
        left,
        width
      )
    );
  }

  if (isOdakyu) {
    gradients.push(
      createBarGradient(
        'bar-shadow',
        ['#00000000', '#00000033', '#00000000'],
        barLeft,
        barWidth,
        {
          locations: [barHighlightOffset, 0.55, 0.85],
        }
      )
    );
    gradients.push(
      createBarGradient(
        'bar-gloss',
        ['#ffffff44', '#ffffff11', '#00000000'],
        barLeft,
        barWidth,
        {
          locations: [0, barHighlightOffset, barHighlightOffset],
        }
      )
    );
  }

  return gradients;
};

const StationNameCellBase: React.FC<StationNameCellProps> = ({
  station,
  index,
  stations,
  line,
  lineColors,
  hasTerminus,
  chevronColors,
  isOdakyu,
  estimatedMinutes,
}: StationNameCellProps) => {
  const arrived = useAtomValue(arrivedAtom);
  // 現在地基準の現在駅(到着取りこぼし時はヘッダーの「まもなく」と一致する側へ自己修復)
  const currentStation = useDisplayCurrentStation();
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

  const dim = useLandscapeWindowDimensions();

  const hasDrawableNumbering = useMemo(
    () =>
      station.stationNumbers?.some(
        (sn) => sn?.lineSymbolShape && sn?.stationNumber
      ) ?? false,
    [station.stationNumbers]
  );

  const nameCommonStyle = useMemo(() => {
    if (!isOdakyu || !hasDrawableNumbering) {
      return styles.nameCommon;
    }
    return {
      ...styles.nameCommon,
      marginBottom: isTablet ? 45 : 95,
    };
  }, [isOdakyu, hasDrawableNumbering]);

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
            nameCommonStyle,
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
        {isOdakyu ? (
          <NumberingIconView
            station={station}
            shouldGrayscale={shouldGrayscale}
          />
        ) : null}
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
          isOdakyu,
        })}
        <LineDot
          station={station}
          shouldGrayscale={shouldGrayscale}
          transferLines={transferLines}
          arrived={arrived}
          passed={passed}
          isOdakyu={isOdakyu}
          estimatedMinutes={estimatedMinutes}
          isLast={stations.length - 1 === index}
        />
        {stations.length - 1 === index ? (
          isOdakyu ? (
            <BarTerminalOdakyu
              width={isTablet ? 24 : 16}
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
              barHighlightOffset={ODAKYU_HIGHLIGHT_OFFSET}
            />
          ) : (
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
          )
        ) : null}
      </View>
      <View
        style={[
          styles.chevron,
          additionalChevronStyle,
          {
            bottom: isTablet
              ? dim.height / 3.5 + (STATION_NAME_CONTAINER_BOTTOM ?? 0) - 52
              : 32,
            marginLeft: widthScale(14),
          },
        ]}
      >
        {(currentStationIndex < 1 && index === 0) ||
        currentStationIndex === index ? (
          <BlinkingChevron colors={chevronColors} />
        ) : null}
      </View>
    </>
  );
};

// 点滅チェブロンを分離したことでセルのpropsは駅データ変化時にしか変わらないため、
// memo化により毎秒・毎tickの不要な再レンダーを防ぐ
const StationNameCell = React.memo(StationNameCellBase);

const DEFAULT_CHEVRON_PAIR: readonly [ChevronColor, ChevronColor] = [
  'RED',
  'BLUE',
];

const LineBoardEast: React.FC<Props> = ({
  stations,
  hasTerminus,
  lineColors,
  chevronColorPair = DEFAULT_CHEVRON_PAIR,
  isOdakyu,
}: Props) => {
  const selectedLine = useAtomValue(selectedLineAtom);
  const currentLine = useCurrentLine();
  // useAfterNextStation が案内面共通の次駅 (useDisplayNextStation) 起点に
  // なったため、バナーの「◯◯のつぎは」側も同じ次駅を参照して整合を保つ
  const nextStation = useDisplayNextStation();
  const afterNextStation = useAfterNextStation();
  // 小田急テーマはETA表示の対象外のためクエリごと実行しない
  const { route: estimatedRoute } = useEstimateArrivalTimes({
    skip: isOdakyu,
  });
  const estimatedMinutesByStationId =
    useEstimatedMinutesByStationId(estimatedRoute);

  const dim = useLandscapeWindowDimensions();

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const hasPassStation = useMemo(
    () => stations.some((s) => getIsPass(s)),
    [stations]
  );

  const showNextStopBanner = useMemo(
    () =>
      isOdakyu &&
      isTablet &&
      hasPassStation &&
      !!nextStation?.name &&
      !!afterNextStation?.name,
    [isOdakyu, hasPassStation, nextStation?.name, afterNextStation?.name]
  );

  // 旧実装の点滅順(初期=pair[1]、次=pair[0])を保ったままBlinkingChevronへ渡す
  const chevronColors = useMemo<readonly [ChevronColor, ChevronColor]>(
    () => [chevronColorPair[1], chevronColorPair[0]],
    [chevronColorPair]
  );

  const stationsWithEmpty = useMemo(() => {
    const filled = stations.length >= 8 ? stations : [...stations];
    while (filled.length < 8) {
      // 残りスロットは undefined のまま埋め切る (型上は Station[] にキャスト)
      filled.push(undefined as unknown as Station);
    }
    return filled;
  }, [stations]);

  const stationNameCellForMap = useCallback(
    (s: Station, i: number): React.ReactNode | null => {
      // padded 後の長さは常に 8 なので最後尾は i === 7
      const isLast = i === 7;

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
            chevronColors={chevronColors}
            isOdakyu={isOdakyu}
            estimatedMinutes={
              s.id != null ? estimatedMinutesByStationId.get(s.id) : null
            }
          />
        </React.Fragment>
      );
    },
    [
      chevronColors,
      hasTerminus,
      line,
      lineColors,
      stations,
      isOdakyu,
      estimatedMinutesByStationId,
    ]
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
      {showNextStopBanner ? (
        <LinearGradient
          colors={['white', '#ccc', '#ccc', 'white']}
          start={[0, 1]}
          end={[1, 0]}
          locations={[0, 0.1, 0.9, 1]}
          style={localStyles.nextStopBanner}
        >
          <Heading style={localStyles.nextStopBannerText}>
            {`${nextStation?.name}のつぎは${afterNextStation?.name}にとまります`}
          </Heading>
        </LinearGradient>
      ) : null}
    </View>
  );
};

export default React.memo(LineBoardEast);
