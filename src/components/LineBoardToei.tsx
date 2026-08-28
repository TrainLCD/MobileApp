import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { Line, Station, StationNumber } from '~/@types/graphql';
import {
  useCurrentLine,
  useDisplayCurrentStation,
  useEstimateArrivalTimes,
  useEstimatedMinutesByStationId,
  useLandscapeWindowDimensions,
  useStationNumberIndexFunc,
  useTransferLinesFromStation,
} from '~/hooks';
import { useScale } from '~/hooks/useScale';
import { enabledLanguagesAtom } from '~/store/atoms/navigation';
import { arrivedAtom } from '~/store/atoms/station';
import { isEnAtom } from '~/store/selectors/isEn';
import getStationNameR from '~/utils/getStationNameR';
import { RFValue } from '~/utils/rfValue';
import { selectedLineAtom } from '../store/atoms/line';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import { BarTerminalEast } from './BarTerminalEast';
import {
  BlinkingChevron,
  EmptyStationNameCell,
  LineDot,
} from './LineBoard/shared/components';
import {
  useBarStyles,
  useChevronPosition,
  useIncludesLongStationName,
} from './LineBoard/shared/hooks/useBarStyles';
import {
  commonLineBoardStyles,
  getHorizontalStationNameOffset,
  getHorizontalStationNameWidth,
  HORIZONTAL_STATION_NAME_MAX_CHARS,
  STATION_NAME_CONTAINER_BOTTOM,
} from './LineBoard/shared/styles/commonStyles';
import Typography from './Typography';

type Props = {
  lineColors: (string | null | undefined)[];
  stations: Station[];
  hasTerminus: boolean;
};

/** 英語表記の斜め書きが1行に収める幅(全角文字数換算) */
export const EN_STATION_NAME_MAX_CHARS = 7.5;

const localStyles = StyleSheet.create({
  splittedStationName: {
    marginLeft: 1,
  },
  stationNameExtra: {
    fontSize: RFValue(10),
    fontWeight: 'bold',
  },
  // 縦書きの併記は1文字ずつ Text を並べるため、Android では行の余白ぶん字間が
  // 開いて日本語の駅名よりはるかに縦長になる。日本語側(stationName)と同じ考え方で
  // 負のマージンを当てて詰める。
  splittedStationNameExtraChar: {
    fontSize: RFValue(10),
    fontWeight: 'bold',
    marginBottom: Platform.select({ android: isTablet ? -5 : -4, ios: 0 }),
  },
  splittedStationNameWithExtraLang: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  nameCommon: {
    marginBottom: isTablet ? undefined : 84,
  },
  stationNumber: {
    position: isTablet ? 'relative' : 'absolute',
    width: isTablet ? 60 : 45,
    fontSize: RFValue(12),
    fontWeight: 'bold',
    left: isTablet ? undefined : -5,
    marginLeft: isTablet ? -5 : undefined,
    bottom: isTablet ? 0 : 64,
    textAlign: 'center',
  },
  stationNumberPlaceholder: {
    opacity: 0,
  },
});

const styles = { ...commonLineBoardStyles, ...localStyles };

// Toei-specific StationName component with multi-language support
interface StationNameToeiProps {
  station: Station;
  en?: boolean;
  horizontal?: boolean;
  passed?: boolean;
  isKoEnabled?: boolean;
  isZhEnabled?: boolean;
  hasNumbering?: boolean;
}

const StationNameToeiBase: React.FC<StationNameToeiProps> = ({
  station,
  en,
  horizontal,
  passed,
  isKoEnabled,
  isZhEnabled,
  hasNumbering,
}) => {
  const stationNameR = useMemo(() => getStationNameR(station), [station]);
  const dim = useLandscapeWindowDimensions();

  const horizontalAdditionalStyle = useMemo(() => {
    // 従来の折り返し幅(画面短辺基準)。回転後の見た目をこの幅のときと揃えるための基準
    const previousWidth = hasNumbering
      ? isTablet
        ? dim.height / 3.5
        : dim.height / 2
      : isTablet
        ? dim.height / 3
        : dim.height / 2.5;
    const baseMarginBottom =
      hasNumbering && !isTablet ? dim.height / 6 : dim.height / 10;

    // 英語表記は中国語の併記が次の行に付くぶん行数が増える。斜め書きの外接矩形の
    // 高さは (幅 × sin55°) が支配的なので、幅を広げると回転後に親の高さを超え、
    // はみ出した分が Android 側で切り取られてしまう(併記が消える)。英語は単語
    // 単位で折り返されるため幅を詰めても行数が増えにくく、日本語より狭く取る。
    // 日本語側はナンバリングを駅名の下に置くぶん斜め書きを長く伸ばせるので広く取る。
    const width = en
      ? getHorizontalStationNameWidth(EN_STATION_NAME_MAX_CHARS)
      : getHorizontalStationNameWidth(
          HORIZONTAL_STATION_NAME_MAX_CHARS + (hasNumbering ? 0.5 : 0)
        );
    const offset = getHorizontalStationNameOffset(previousWidth, width);

    return {
      width,
      marginLeft: offset.marginLeft,
      marginBottom: baseMarginBottom + offset.marginBottom,
    };
  }, [dim.height, hasNumbering, en]);

  if (en) {
    return (
      <Typography
        style={[
          styles.stationNameHorizontal,
          passed ? styles.grayColor : null,
          horizontalAdditionalStyle,
        ]}
      >
        {stationNameR}
        {isZhEnabled && station.nameChinese ? (
          <>
            {'\n'}
            <Typography
              style={[
                styles.stationNameExtra,
                passed ? styles.grayColor : null,
              ]}
            >
              {station.nameChinese}
            </Typography>
          </>
        ) : null}
      </Typography>
    );
  }

  if (horizontal) {
    return (
      <Typography
        style={[
          styles.stationNameHorizontal,
          passed ? styles.grayColor : null,
          horizontalAdditionalStyle,
        ]}
      >
        {station.name}
        {isKoEnabled && station.nameKorean ? (
          <>
            {'\n'}
            <Typography
              style={[
                styles.stationNameExtra,
                passed ? styles.grayColor : null,
              ]}
            >
              {station.nameKorean}
            </Typography>
          </>
        ) : null}
      </Typography>
    );
  }

  return (
    <View style={styles.splittedStationNameWithExtraLang}>
      <View>
        {(station.name ?? '').split('').map((c, j) => (
          <Typography
            style={[styles.stationName, passed ? styles.grayColor : null]}
            key={`${station.id}-ja-${j}`}
          >
            {c}
          </Typography>
        ))}
      </View>
      {isKoEnabled && station.nameKorean ? (
        <View style={styles.splittedStationName}>
          {station.nameKorean.split('').map((c, j) => (
            <Typography
              style={[
                styles.splittedStationNameExtraChar,
                passed ? styles.grayColor : null,
              ]}
              key={`${station.id}-ko-${j}`}
            >
              {c}
            </Typography>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const StationNameToei = React.memo(StationNameToeiBase);

interface StationNameCellProps {
  station: Station;
  index: number;
  stations: Station[];
  line: Line;
  lineColors: (string | null | undefined)[];
  hasTerminus: boolean;
  estimatedMinutes?: number | null;
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

// 旧実装の点滅順(初期=BLUE、次=RED)を保つ
const TOEI_CHEVRON_COLORS = ['BLUE', 'RED'] as const;

const StationNameCellBase: React.FC<StationNameCellProps> = ({
  station,
  index,
  stations,
  line,
  lineColors,
  hasTerminus,
  estimatedMinutes,
}: StationNameCellProps) => {
  const arrived = useAtomValue(arrivedAtom);
  // 現在地基準の現在駅(到着取りこぼし時はヘッダーの「まもなく」と一致する側へ自己修復)
  const currentStation = useDisplayCurrentStation();
  const isEn = useAtomValue(isEnAtom);
  const enabledLanguages = useAtomValue(enabledLanguagesAtom);
  const isKoEnabled = enabledLanguages.includes('KO');
  const isZhEnabled = enabledLanguages.includes('ZH');

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
  const getStationNumberIndex = useStationNumberIndexFunc();
  const stationNumberIndex = useMemo(
    () => getStationNumberIndex(currentStation ?? undefined),
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
          <StationNameToei
            station={station}
            en={isEn}
            horizontal={includesLongStationName}
            passed={shouldGrayscale}
            isKoEnabled={isKoEnabled}
            isZhEnabled={isZhEnabled}
            hasNumbering={!!numberingObj?.stationNumber}
          />
        </View>
        {numberingObj?.stationNumber ? (
          <Typography
            style={[
              styles.stationNumber,
              shouldGrayscale ? styles.grayColor : null,
            ]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {numberingObj.stationNumber}
          </Typography>
        ) : isTablet ? (
          // iPadではstationNumberがposition:'relative'で高さを占めるため、
          // ナンバリング非表示時も同サイズの不可視プレースホルダーを描画し、
          // 駅名（特に斜め表示）がバーへ沈み込むのを防ぐ
          <Typography
            style={[styles.stationNumber, styles.stationNumberPlaceholder]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {' '}
          </Typography>
        ) : null}
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
          estimatedMinutes={estimatedMinutes}
          isLast={isLastStation}
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
            bottom: isTablet
              ? dim.height / 3.5 + (STATION_NAME_CONTAINER_BOTTOM ?? 0) - 52
              : 32,
            marginLeft: widthScale(15),
          },
        ]}
      >
        {shouldShowChevron ? (
          <BlinkingChevron colors={TOEI_CHEVRON_COLORS} />
        ) : null}
      </View>
    </>
  );
};

// 点滅チェブロンを分離したことでセルのpropsは駅データ変化時にしか変わらないため、
// memo化により毎秒・毎tickの不要な再レンダーを防ぐ
const StationNameCell = React.memo(StationNameCellBase);

const LineBoardToei: React.FC<Props> = ({
  stations,
  hasTerminus,
  lineColors,
}: Props) => {
  const selectedLine = useAtomValue(selectedLineAtom);
  const currentLine = useCurrentLine();

  const dim = useLandscapeWindowDimensions();
  const { route: estimatedRoute } = useEstimateArrivalTimes();
  const estimatedMinutesByStationId =
    useEstimatedMinutesByStationId(estimatedRoute);

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

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
            estimatedMinutes={
              s.id != null ? estimatedMinutesByStationId.get(s.id) : null
            }
          />
        </React.Fragment>
      );
    },
    [hasTerminus, line, lineColors, stations, estimatedMinutesByStationId]
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
