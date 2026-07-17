import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
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
import { useIncludesLongStationName } from './LineBoard/shared/hooks/useBarStyles';
import {
  BAR_BOTTOM_JO,
  BAR_HEIGHT_JO,
  commonLineBoardStyles,
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

// Local style overrides specific to JO
const localStyles = StyleSheet.create({
  root: {
    flex: 1,
    height: '100%',
    bottom: isTablet ? '40%' : undefined,
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

interface StationNameProps {
  station: Station;
  en?: boolean;
  horizontal?: boolean;
  passed?: boolean;
}

const StationName: React.FC<StationNameProps> = ({
  station,
  en,
  horizontal,
  passed,
}: StationNameProps) => {
  const stationNameR = useMemo(() => getStationNameR(station), [station]);

  if (en) {
    return (
      <Typography
        style={[styles.stationNameEnJO, passed ? styles.grayColor : null]}
      >
        {stationNameR}
      </Typography>
    );
  }
  if (horizontal) {
    return (
      <Typography
        style={[styles.stationNameEnJO, passed ? styles.grayColor : null]}
      >
        {station.name}
      </Typography>
    );
  }
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

  const additionalPadLineMarksContainerStyle = useMemo(() => {
    // rootWestJOのbottomがAndroidでは'30%'、iPadでは'40%'のため、
    // 差分の10%をdim.heightに基づいて動的に補正
    const androidOffset =
      Platform.OS === 'android' && isTablet ? Math.round(dim.height * 0.1) : 0;
    if (!stationInLoop.stationNumbers?.length) {
      return {
        top: dim.height - 130 + androidOffset,
      };
    }
    return {
      top: dim.height - 90 + androidOffset,
    };
  }, [stationInLoop.stationNumbers, dim.height]);

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
  // ドット中央とstationNameContainer中央の水平位置差分を補正
  const numberingLeftOffset = useMemo(() => {
    if (!isTablet || Platform.OS !== 'android') {
      return undefined;
    }
    const containerWidth = dim.width / 9;
    const dotCenter = barWidth * (index + 1) - barWidth / 2;
    const wrapperMarginLeft = barWidth / 2.5;
    const containerCenter =
      wrapperMarginLeft + index * containerWidth + containerWidth / 2;
    return dotCenter - containerCenter + 16;
  }, [barWidth, dim.width, index]);

  return (
    <View
      style={[
        styles.stationNameContainerJO,
        {
          width: dim.width / 9,
        },
      ]}
    >
      <StationName
        station={stationInLoop}
        en={isEn}
        horizontal={includesLongStationName}
        passed={isPass}
      />

      <View
        style={[
          styles.numberingIconContainerJO,
          numberingLeftOffset != null && { left: numberingLeftOffset },
        ]}
      >
        {numberingObj &&
        isTablet &&
        hasNumberedStation &&
        numberingObj.lineSymbolShape &&
        numberingObj.stationNumber ? (
          <NumberingIcon
            shape={numberingObj.lineSymbolShape}
            lineColor={numberingColor}
            stationNumber={numberingObj.stationNumber}
            threeLetterCode={stationInLoop.threeLetterCode}
            allowScaling={false}
          />
        ) : null}
      </View>

      <View
        style={[
          styles.padLineMarksContainerJO,
          additionalPadLineMarksContainerStyle,
        ]}
      >
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
          key={s.id}
          index={i}
          station={s}
          stations={stations}
          arrived={!isPassing}
          hasNumberedStation={(s.stationNumbers?.length ?? 0) > 0}
        />
      );
    },
    [isPassing, stations]
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
    <View style={styles.root}>
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
