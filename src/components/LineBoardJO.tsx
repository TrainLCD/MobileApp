import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { Station, StationNumber } from '~/@types/graphql';
import {
  useCurrentLine,
  useDisplayCurrentStation,
  useEstimateArrivalTimes,
  useEstimatedMinutesByStationId,
  useIsPassing,
  useLandscapeWindowDimensions,
  useStationNumberIndexFunc,
  useTransferLinesFromStation,
} from '~/hooks';
import { HEADER_E235_TABLET_HEIGHT } from '../constants';
import { selectedLineAtom } from '../store/atoms/line';
import { arrivedAtom } from '../store/atoms/station';
import { isEnAtom } from '../store/selectors/isEn';
import getStationNameR from '../utils/getStationNameR';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import { getNumberingColor } from '../utils/numbering';
import { ChevronJO } from './ChevronJO';
import { JOCurrentArrowEdge } from './JOCurrentArrowEdge';
import {
  EstimatedMinutesBadge,
  EstimatedMinutesUnitLabel,
} from './LineBoard/shared/components';
import { FittedEnglishStationName } from './LineBoard/shared/components/FittedEnglishStationName';
import { useIncludesLongStationName } from './LineBoard/shared/hooks/useBarStyles';
import {
  BAR_BOTTOM_JO,
  BAR_HEIGHT_JO,
  commonLineBoardStyles,
  HORIZONTAL_STATION_NAME_FONT_SIZE,
} from './LineBoard/shared/styles/commonStyles';
import NumberingIcon from './NumberingIcon';
import PadLineMarks from './PadLineMarks';
import PassChevronEast from './PassChevronEast';
import Typography from './Typography';

interface Props {
  stations: Station[];
  lineColors: (string | null | undefined)[];
}

const useBarWidth = () => {
  const dim = useLandscapeWindowDimensions();
  return isTablet ? (dim.width - 120) / 8 : (dim.width - 96) / 7.835;
};

// 旧来のドットサイズ。getLeftはこのサイズのドットの左端位置を前提としている
// ため、拡大後の中心合わせ補正の基準として残している
const LEGACY_DOT_SIZE = 32;
// 未通過駅のドットはバーの高さから上下4pxずつ控えたサイズ(高さ100%-8px)の正方形
const DOT_SIZE_JO = BAR_HEIGHT_JO - 8;
// 終端矢印が画面右端から離れすぎないよう、最終セグメントを右へ延長する
const BAR_TAIL_EXTENSION_JO = isTablet ? 24 : 14;
// ETA数字はドット幅を超えるサイズで表示するため、ドット中心に重ねる
// 絶対配置コンテナの寸法。width未指定の絶対配置子は親(ドット)幅上限で
// 測られて数字が折り返されるため、明示widthが必須
const ESTIMATED_MINUTES_BADGE_WIDTH = isTablet ? 96 : 64;
const ESTIMATED_MINUTES_BADGE_HEIGHT = isTablet ? 40 : 30;

// JO・JLともタブレットのヘッダーは200dp。路線図の上方移動と同じ割合で
// ヘッダー下に残る高さから、斜めの駅名を折り返す幅を求める。
const ANDROID_TABLET_RAISE_PERCENT = 30;
const TABLET_LABEL_BOTTOM = BAR_BOTTOM_JO + BAR_HEIGHT_JO + 14;
const LABEL_ANGLE = 55;
const labelRadians = (LABEL_ANGLE * Math.PI) / 180;
const labelHeight = Math.ceil(HORIZONTAL_STATION_NAME_FONT_SIZE * 1.4);

const getLabelSpace = (height: number) =>
  (height - HEADER_E235_TABLET_HEIGHT) *
    (1 - ANDROID_TABLET_RAISE_PERCENT / 100) -
  TABLET_LABEL_BOTTOM;

const getJODiagonalLabelWidth = (height: number, rightSpace: number) => {
  const visibleHeight = getLabelSpace(height);
  return Math.max(
    1,
    Math.min(
      (visibleHeight - labelHeight * Math.cos(labelRadians)) /
        Math.sin(labelRadians),
      rightSpace / Math.cos(labelRadians)
    )
  );
};

// Local style overrides specific to JO
const localStyles = StyleSheet.create({
  root: {
    flex: 1,
    height: '100%',
    bottom: isTablet
      ? Platform.select({
          android: `${ANDROID_TABLET_RAISE_PERCENT}%` as const,
          default: '40%',
        })
      : undefined,
    marginLeft: isTablet ? 48 : 32,
  },
  // 最終ドットの右にドットと同じ高さで縦中央揃え。
  // ラベル自体が固有幅を持つため、ドット幅によるYogaの切り詰めは受けない
  estimatedMinutesUnitContainer: {
    position: 'absolute',
    top: 0,
    left: DOT_SIZE_JO + (isTablet ? 8 : 4),
    height: DOT_SIZE_JO,
    justifyContent: 'center',
  },
  estimatedMinutesBadgeContainer: {
    position: 'absolute',
    left: (DOT_SIZE_JO - ESTIMATED_MINUTES_BADGE_WIDTH) / 2,
    top: (DOT_SIZE_JO - ESTIMATED_MINUTES_BADGE_HEIGHT) / 2,
    width: ESTIMATED_MINUTES_BADGE_WIDTH,
    height: ESTIMATED_MINUTES_BADGE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  estimatedMinutesText: {
    fontSize: isTablet ? 38 : 24,
    lineHeight: isTablet ? 40 : 26,
  },
});

const styles = { ...commonLineBoardStyles, ...localStyles };

type ReportLabelHeight = (id: number, height: number) => void;

interface StationNameProps {
  index: number;
  reportLabelHeight: ReportLabelHeight;
  station: Station;
  en?: boolean;
  hidden?: boolean;
  horizontal?: boolean;
  passed?: boolean;
  diagonalLayout?: { left: number; width: number };
}

const StationName: React.FC<StationNameProps> = ({
  station,
  en,
  hidden,
  horizontal,
  passed,
  diagonalLayout,
  index,
  reportLabelHeight,
}: StationNameProps) => {
  const stationNameR = useMemo(() => getStationNameR(station), [station]);

  const measureLabel = !!diagonalLayout && !!(en || horizontal);
  useEffect(() => {
    if (measureLabel) return () => reportLabelHeight(index, 0);
  }, [measureLabel, reportLabelHeight, index]);

  if (en || horizontal) {
    return (
      <Typography
        accessibilityElementsHidden={hidden}
        importantForAccessibility={hidden ? 'no-hide-descendants' : undefined}
        pointerEvents={hidden ? 'none' : undefined}
        onLayout={
          measureLabel
            ? ({ nativeEvent: { layout } }) => {
                reportLabelHeight(
                  index,
                  layout.width * Math.sin(labelRadians) +
                    layout.height * Math.cos(labelRadians)
                );
              }
            : undefined
        }
        style={[
          styles.stationNameEnJO,
          en && styles.englishStationNameSpacing,
          hidden && { opacity: 0 },
          passed ? styles.grayColor : null,
          diagonalLayout && {
            ...diagonalLayout,
            position: 'absolute',
            bottom: 0,
            marginLeft: 0,
            marginBottom: 0,
            transformOrigin: 'left bottom',
            transform: [{ rotate: `-${LABEL_ANGLE}deg` }],
          },
        ]}
      >
        {en ? stationNameR : station.name}
      </Typography>
    );
  }
  if (hidden) return null;
  return (
    <View style={styles.verticalStationNameJO}>
      {station.name?.split('').map((c, j) => (
        <Typography
          style={[styles.stationNameJO, passed ? styles.grayColor : null]}
          key={`${j + 1}${c}`}
        >
          {c}
        </Typography>
      ))}
    </View>
  );
};

interface StationNameCellProps {
  reportLabelHeight: ReportLabelHeight;
  arrived: boolean;
  stations: Station[];
  station: Station;
  hasNumberedStation: boolean;
  index: number;
}

const StationNameCell: React.FC<StationNameCellProps> = ({
  stations,
  arrived,
  station: stationInLoop,
  reportLabelHeight,
  hasNumberedStation,
  index,
}: StationNameCellProps) => {
  const isEn = useAtomValue(isEnAtom);

  const transferLines = useTransferLinesFromStation(stationInLoop, {
    omitJR: true,
    omitRepeatingLine: true,
  });

  const isPass = useMemo(() => getIsPass(stationInLoop), [stationInLoop]);

  const includesLongStationName = useIncludesLongStationName(stations);

  const getStationNumberIndex = useStationNumberIndexFunc();
  const stationNumberIndex = getStationNumberIndex(stationInLoop);
  const numberingObj = useMemo<StationNumber | undefined>(
    () => stationInLoop.stationNumbers?.[stationNumberIndex],
    [stationInLoop.stationNumbers, stationNumberIndex]
  );
  const dim = useLandscapeWindowDimensions();

  const numberingColor = useMemo(
    () =>
      getNumberingColor(
        arrived,
        numberingObj,
        stationInLoop,
        stationInLoop.line
      ),
    [arrived, numberingObj, stationInLoop]
  );

  const barWidth = useBarWidth();
  const cellWidth = dim.width / 9;
  const dotCenter = barWidth * (index + 0.5) + LEGACY_DOT_SIZE / 2;
  const phoneDotCenter = barWidth * (index + 0.4) + LEGACY_DOT_SIZE / 2;
  const dotCenterInCell = dotCenter - barWidth / 2.5 - index * cellWidth;
  const androidTablet = isTablet && Platform.OS === 'android';
  const shape = numberingObj?.lineSymbolShape;
  const stationNumber = numberingObj?.stationNumber;
  const showNumberingIcon =
    isTablet && hasNumberedStation && !!shape && !!stationNumber;
  // 駅名セルの下端は路線図の下端より TABLET_LABEL_BOTTOM だけ上にある。
  const transferPosition = androidTablet
    ? {
        top: '100%' as const,
        marginTop:
          TABLET_LABEL_BOTTOM - BAR_BOTTOM_JO + (showNumberingIcon ? 40 : 0),
      }
    : { top: dim.height - (stationInLoop.stationNumbers?.length ? 90 : 130) };
  const numberingLeftOffset = androidTablet
    ? dotCenterInCell - cellWidth / 2
    : undefined;

  return (
    <View
      style={[
        styles.stationNameContainerJO,
        {
          width: cellWidth,
          ...(androidTablet && { bottom: TABLET_LABEL_BOTTOM }),
        },
      ]}
    >
      {Platform.OS === 'android' && !isTablet && isEn ? (
        // セルの下余白がバーとの間隔を確保するため、駅名側に下余白を重ねない。
        <FittedEnglishStationName
          pitch={barWidth}
          station={stationInLoop}
          passed={isPass}
          bottom={0}
          left={phoneDotCenter - barWidth / 2.5 - index * cellWidth}
          rightSpace={dim.width - 32 - phoneDotCenter}
        />
      ) : (
        (androidTablet ? [false, true] : [isEn]).map((english) => (
          <StationName
            key={english ? 'en' : 'ja'}
            index={index * 2 + Number(english)}
            reportLabelHeight={reportLabelHeight}
            station={stationInLoop}
            en={english}
            hidden={androidTablet && english !== isEn}
            horizontal={includesLongStationName}
            passed={isPass}
            diagonalLayout={
              androidTablet
                ? {
                    left: dotCenterInCell,
                    width: getJODiagonalLabelWidth(
                      dim.height,
                      dim.width - 48 - dotCenter
                    ),
                  }
                : undefined
            }
          />
        ))
      )}
      <View
        style={[
          styles.numberingIconContainerJO,
          numberingLeftOffset != null && { left: numberingLeftOffset },
        ]}
      >
        {showNumberingIcon ? (
          <NumberingIcon
            shape={shape}
            lineColor={numberingColor}
            stationNumber={stationNumber}
            threeLetterCode={stationInLoop.threeLetterCode}
            allowScaling={false}
          />
        ) : null}
      </View>

      <View style={[styles.padLineMarksContainerJO, transferPosition]}>
        <PadLineMarks
          shouldGrayscale={isPass}
          transferLines={transferLines}
          station={stationInLoop}
        />
      </View>
    </View>
  );
};

const LineBoardJO: React.FC<Props> = ({ stations, lineColors }: Props) => {
  const { height } = useLandscapeWindowDimensions();
  const [labelHeights, setLabelHeights] = useState<Record<number, number>>({});
  const reportLabelHeight = useCallback<ReportLabelHeight>((id, extent) => {
    setLabelHeights((previous) => {
      if ((previous[id] ?? 0) === extent) return previous;
      const next = { ...previous };
      if (extent) next[id] = extent;
      else delete next[id];
      return next;
    });
  }, []);
  // 幅を再計算すると再改行が起きるため、実測した不足分だけ路線図全体を下げる。
  const offset = Math.ceil(
    Math.max(
      0,
      ...stations.map(
        (_, index) =>
          Math.max(
            labelHeights[index * 2] ?? 0,
            labelHeights[index * 2 + 1] ?? 0
          ) - getLabelSpace(height)
      )
    )
  );
  const arrived = useAtomValue(arrivedAtom);
  const selectedLine = useAtomValue(selectedLineAtom);
  const isPassing = useIsPassing();
  // 現在地基準の現在駅(到着取りこぼし時はヘッダーの「まもなく」と一致する側へ自己修復)
  const station = useDisplayCurrentStation();
  const currentLine = useCurrentLine();
  const barWidth = useBarWidth();
  const { route: estimatedRoute } = useEstimateArrivalTimes();
  const estimatedMinutesByStationId =
    useEstimatedMinutesByStationId(estimatedRoute);

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const currentStationIndex = useMemo(
    () => stations.findIndex((s) => s.groupId === station?.groupId),
    [station?.groupId, stations]
  );

  const stationNameCellForMap = useCallback(
    (s: Station, i: number) => {
      return (
        <StationNameCell
          key={i}
          reportLabelHeight={reportLabelHeight}
          index={i}
          station={s}
          stations={stations}
          arrived={!isPassing}
          hasNumberedStation={(s.stationNumbers?.length ?? 0) > 0}
        />
      );
    },
    [isPassing, stations, reportLabelHeight]
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

  const getLeft = useCallback(
    (index: number) => {
      if (isTablet) {
        return barWidth * (index + 1) - barWidth / 2;
      }
      return barWidth * (index + 1) - barWidth * 0.6;
    },
    [barWidth]
  );

  const getBottom = useCallback(
    (index: number) => {
      // 通過済み・現在駅の16pxドットはバーの縦中央に揃える
      if (index <= currentStationIndex) {
        return isTablet ? BAR_BOTTOM_JO + 24 : BAR_BOTTOM_JO + 12;
      }
      // 未通過駅のドット(バー高さ-8px)は上下4pxずつ控えてバー内に収める
      return BAR_BOTTOM_JO + (BAR_HEIGHT_JO - DOT_SIZE_JO) / 2;
    },
    [currentStationIndex]
  );

  if (!line) {
    return null;
  }

  return (
    <View
      testID="line-board-jo"
      style={[
        styles.root,
        offset > 0 &&
          isTablet &&
          Platform.OS === 'android' && { transform: [{ translateY: offset }] },
      ]}
    >
      {[...lineColors, ...emptyArray].map((lc, i, segments) => {
        const stationId = stations[i]?.id;
        const estimatedMinutes =
          stationId != null && i > currentStationIndex
            ? estimatedMinutesByStationId.get(stationId)
            : null;
        const isLastSegment = i === segments.length - 1;
        const dotSize = i <= currentStationIndex ? 16 : DOT_SIZE_JO;
        // getLeftは従来の32pxドットの左端位置を返すため、拡大分を左右へ
        // 均等に配分して従来と中心位置を揃える(16pxドットは従来位置のまま)
        const dotLeft =
          i <= currentStationIndex
            ? getLeft(i)
            : getLeft(i) - (DOT_SIZE_JO - LEGACY_DOT_SIZE) / 2;

        return (
          <React.Fragment key={`${lc}${i.toString()}`}>
            <View
              key={`${lc}${i.toString()}`}
              style={[
                styles.barJO,
                {
                  // barWidthは小数を含むためセグメント境界が物理ピクセルに
                  // 揃わず、丸めの具合で白い継ぎ目が出ることがある。右へ1px
                  // 食み出させて隣接セグメントを重ね、継ぎ目が出ないようにする
                  // (後続セグメントが上に描画されるため境界位置は変わらない)。
                  width:
                    barWidth + 1 + (isLastSegment ? BAR_TAIL_EXTENSION_JO : 0),
                  left: barWidth * i,
                  backgroundColor: (() => {
                    if (i <= currentStationIndex) {
                      if (!arrived) {
                        return '#888';
                      }
                      if (i === currentStationIndex) {
                        return '#dc143c';
                      }
                      return '#888';
                    }

                    return lc ?? '#888';
                  })(),
                },
              ]}
            />
            <View
              style={[
                styles.barJO,
                {
                  left: barWidth * i,
                  backgroundColor: (() => {
                    if (i <= currentStationIndex) {
                      if (!arrived) {
                        return '#888';
                      }
                      if (i === currentStationIndex) {
                        return '#dc143c';
                      }
                      return '#888';
                    }

                    return lc ?? '#888';
                  })(),
                },
              ]}
            />
            {getIsPass(stations[i]) ? (
              <View
                style={[
                  styles.barDotJO,
                  {
                    left: dotLeft,
                    bottom: getBottom(i),
                    width: dotSize,
                    height: dotSize,
                  },
                ]}
              >
                <PassChevronEast />
              </View>
            ) : (
              <View
                style={[
                  styles.barDotJO,
                  {
                    backgroundColor:
                      stations.length <= i ? 'transparent' : 'white',
                    left: dotLeft,
                    bottom: getBottom(i),
                    width: dotSize,
                    height: dotSize,
                  },
                ]}
              >
                {estimatedMinutes != null ? (
                  <View style={localStyles.estimatedMinutesBadgeContainer}>
                    <EstimatedMinutesBadge
                      estimatedMinutes={estimatedMinutes}
                      style={localStyles.estimatedMinutesText}
                    />
                  </View>
                ) : null}
                {i === stations.length - 1 && estimatedMinutes != null ? (
                  <View
                    style={localStyles.estimatedMinutesUnitContainer}
                    pointerEvents="none"
                  >
                    <EstimatedMinutesUnitLabel />
                  </View>
                ) : null}
              </View>
            )}
          </React.Fragment>
        );
      })}

      {arrived ? (
        <View
          style={[
            styles.chevronJO,
            { left: barWidth * (currentStationIndex + 1) },
          ]}
        >
          <JOCurrentArrowEdge
            width={isTablet ? 24 : 15}
            height={isTablet ? 64 : 40}
          />
        </View>
      ) : (
        <View
          style={[
            styles.chevronJO,
            { left: barWidth * (currentStationIndex + 1) - 32 },
          ]}
        >
          <ChevronJO width={isTablet ? 60 : 50} height={isTablet ? 65 : 40} />
        </View>
      )}

      <View
        style={[
          styles.barTerminalJO,
          {
            borderBottomColor: line.color
              ? lineColors.at(-1) || line.color
              : '#000',
            left:
              (isTablet ? barWidth * 8 - 16 : barWidth * 8 - 10) +
              BAR_TAIL_EXTENSION_JO,
          },
        ]}
      />
      <View
        style={[
          styles.stationNameWrapperJO,
          {
            marginLeft: barWidth / 2.5,
          },
        ]}
      >
        {stations.map(stationNameCellForMap)}
      </View>
    </View>
  );
};

export default React.memo(LineBoardJO);
