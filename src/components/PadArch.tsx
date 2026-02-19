import { darken } from 'polished';
import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Path, Svg } from 'react-native-svg';
import type { Line, LineNested, Station } from '~/@types/graphql';
import { isBusLine } from '~/utils/line';
import {
  MANY_LINES_THRESHOLD,
  MARK_SHAPE,
  NUMBERING_ICON_SIZE,
  parenthesisRegexp,
  YAMANOTE_CHEVRON_MOVE_DURATION,
  YAMANOTE_CHEVRON_SCALE_DURATION,
  YAMANOTE_LINE_BOARD_FILL_DURATION,
} from '../constants';
import type { LineMark } from '../models/LineMark';
import getIsPass from '../utils/isPass';
import { ChevronYamanote } from './ChevronYamanote';
import NumberingIcon from './NumberingIcon';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';
import Typography from './Typography';

type NumberingInfo = {
  stationNumber: string;
  lineMarkShape: LineMark;
  lineColor: string;
};

type Props = {
  line: Line;
  stations: Station[];
  arrived: boolean;
  transferLines: Line[];
  station: Station | null;
  numberingInfo: (NumberingInfo | null)[];
  lineMarks: (LineMark | null)[];
  trainTypeLines: LineNested[];
  isEn: boolean;
};

type ColorSegment = {
  color: string;
  yStart: number;
  yEnd: number;
};

// animatedSurface の bottom: -200 によるSVG座標系オフセット
const ARC_SVG_Y_OFFSET = 200;

const computeColorSegments = (
  stations: Station[],
  trainTypeLines: LineNested[],
  fallbackColor: string,
  height: number
): ColorSegment[] => {
  if (stations.length === 0) {
    return [{ color: fallbackColor, yStart: -height, yEnd: 2 * height }];
  }

  // station.lines と trainType.lines の路線IDを照合して色を決定
  // マッチしない駅は null にして隣接する確定色で埋める
  const resolvedColors: (string | null)[] = stations.map((s) => {
    if (!s) return null;

    for (const ttLine of trainTypeLines) {
      if (s.lines?.some((sl) => sl.id === ttLine.id)) {
        return ttLine.color ?? null;
      }
    }

    // trainTypeLinesが空なら駅固有の色を使用
    return trainTypeLines.length > 0 ? null : (s.line?.color ?? null);
  });

  // null を隣接する確定色で埋める（前方 → 後方の順）
  for (let i = 1; i < resolvedColors.length; i++) {
    if (resolvedColors[i] === null) resolvedColors[i] = resolvedColors[i - 1];
  }
  for (let i = resolvedColors.length - 2; i >= 0; i--) {
    if (resolvedColors[i] === null) resolvedColors[i] = resolvedColors[i + 1];
  }

  const stationColors = resolvedColors.map((c) => c ?? fallbackColor);

  // 駅のドットy座標（スクリーン座標）
  const dotYs = stations.map((_, i) =>
    i === 0 ? height / 30 : (i * height) / 7
  );

  const segments: ColorSegment[] = [];
  let currentColor = stationColors[0];
  let segStartIdx = 0;

  for (let i = 1; i <= stationColors.length; i++) {
    if (i === stationColors.length || stationColors[i] !== currentColor) {
      // アニメーションSVGはARC_SVG_Y_OFFSETだけ下にずれているため境界もずらす
      // 境界位置: 前の駅ドットと次の駅ドットの間を 0.65 の比率で按分（やや次の駅寄り）
      const BOUNDARY_RATIO = 0.65;
      const yStart =
        segStartIdx === 0
          ? -height
          : dotYs[segStartIdx - 1] * (1 - BOUNDARY_RATIO) +
            dotYs[segStartIdx] * BOUNDARY_RATIO +
            ARC_SVG_Y_OFFSET;
      const yEnd =
        i === stationColors.length
          ? 2 * height
          : dotYs[i - 1] * (1 - BOUNDARY_RATIO) +
            dotYs[i] * BOUNDARY_RATIO +
            ARC_SVG_Y_OFFSET;

      segments.push({ color: currentColor, yStart, yEnd });

      if (i < stationColors.length) {
        currentColor = stationColors[i];
        segStartIdx = i;
      }
    }
  }

  return segments;
};

const styles = StyleSheet.create({
  stationNames: {
    position: 'absolute',
  },
  stationNameContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationName: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  circle: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: 'white',
  },
  arrivedCircle: {
    width: 18,
    height: 18,
    marginLeft: 32,
    marginTop: 24,
  },
  animatedSurface: {
    position: 'absolute',
    bottom: -200,
  },
  clipViewStyle: {
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
  },
  chevron: {
    position: 'absolute',
    width: 60,
    height: 45,
    // 非到着時のベース角度
    transform: [{ rotate: '-20deg' }],
    zIndex: 1,
  },
  chevronArrived: {
    width: 72,
    height: 54,
    transform: [{ rotate: '-110deg' }, { scale: 1.5 }],
    zIndex: 0,
  },
  transfersBase: {
    position: 'absolute',
    left: 24,
  },
  transfersCurrentStationName: {
    fontWeight: 'bold',
    fontSize: 32,
    marginBottom: 4,
  },
  transfersCurrentStationNameEn: {
    fontWeight: 'bold',
    fontSize: 32,
    marginBottom: 21,
  },
  transferAtText: {
    fontSize: 32,
    color: '#555',
    marginBottom: 21,
  },
  transferAtTextEn: {
    fontSize: 32,
    color: '#555',
  },
  transferLines: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  transferLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginRight: 8,
  },
  lineName: {
    fontSize: 24,
    color: '#212121',
    fontWeight: 'bold',
  },
  numberingIconPlaceholder: {
    width: 48,
    height: 96,
  },
  numberingIconContainer: {
    width: 96,
    height: 96,
    transform: [{ scale: 0.5 }],
    marginRight: -16,
  },
  numberingSquareIconContainer: {
    width: 108,
    height: 108,
    transform: [{ scale: 0.5 }],
    marginRight: -16,
  },
  halfOpacity: {
    opacity: 0.5,
  },
});

type TransfersProps = {
  transferLines: Line[];
  lineMarks: (LineMark | null)[];
  station: Station | null;
  isEn: boolean;
  windowWidth: number;
  windowHeight: number;
};

const Transfers: React.FC<TransfersProps> = ({
  transferLines,
  station,
  lineMarks,
  isEn,
  windowWidth,
  windowHeight,
}: TransfersProps) => {
  const isBus = isBusLine(station?.line);

  const dynamicStyles = useMemo(
    () => ({
      transfers: {
        width: windowWidth / 2,
        top: windowHeight / 4,
      },
      transfersMany: {
        top: windowHeight / 6,
      },
      transferLines: { width: windowWidth / 3 },
    }),
    [windowWidth, windowHeight]
  );

  const isMany = transferLines?.length > MANY_LINES_THRESHOLD;

  const renderTransferLines = useCallback(
    (): React.ReactNode[] =>
      transferLines.map((l, i) => {
        const lineMark = lineMarks[i];

        return (
          <View style={styles.transferLine} key={l.id}>
            {lineMark ? (
              <TransferLineMark
                line={l}
                mark={lineMark}
                size={NUMBERING_ICON_SIZE.SMALL}
              />
            ) : (
              <TransferLineDot line={l} small />
            )}
            <Typography style={styles.lineName}>
              {isEn
                ? l.nameRoman?.replace(parenthesisRegexp, '')
                : l.nameShort?.replace(parenthesisRegexp, '')}
            </Typography>
          </View>
        );
      }),
    [isEn, lineMarks, transferLines]
  );

  if (!transferLines?.length) {
    return null;
  }

  return (
    <>
      {isEn ? (
        <View
          style={[
            styles.transfersBase,
            isMany ? dynamicStyles.transfersMany : dynamicStyles.transfers,
          ]}
        >
          <Typography style={styles.transferAtTextEn}>Transfer at</Typography>
          <Typography style={styles.transfersCurrentStationNameEn}>
            {`${station?.nameRoman}${isBus ? '' : ' Station'}`}
          </Typography>
          <View style={[styles.transferLines, dynamicStyles.transferLines]}>
            {renderTransferLines()}
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.transfersBase,
            isMany ? dynamicStyles.transfersMany : dynamicStyles.transfers,
          ]}
        >
          <Typography style={styles.transfersCurrentStationName}>
            {`${station?.name ?? ''}${isBus ? '' : '駅'}`}
          </Typography>
          <Typography style={styles.transferAtText}>乗換えのご案内</Typography>
          <View style={[styles.transferLines, dynamicStyles.transferLines]}>
            {renderTransferLines()}
          </View>
        </View>
      )}
    </>
  );
};

const PadArch: React.FC<Props> = ({
  arrived,
  line,
  stations,
  transferLines,
  station,
  numberingInfo,
  lineMarks,
  trainTypeLines,
  isEn,
}: Props) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // 共有値（Reanimated）
  const bgScale = useSharedValue(0.95);
  // シェブロンのアニメーションは 0..1 の単一タイムラインで駆動
  const chevronTimeline = useSharedValue(0);
  const fillHeight = useSharedValue(0);

  // エフェクト: シェブロンと背景のアニメーション制御
  // biome-ignore lint/correctness/useExhaustiveDependencies: SharedValue は安定した参照のため依存配列に含めません
  useEffect(() => {
    // 既存のアニメーションを停止してから新しいアニメーションを開始
    cancelAnimation(bgScale);
    cancelAnimation(chevronTimeline);

    if (arrived) {
      // 背景スケールを鼓動させる
      bgScale.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: YAMANOTE_CHEVRON_SCALE_DURATION }),
          withTiming(0.95, { duration: YAMANOTE_CHEVRON_SCALE_DURATION })
        ),
        -1,
        false
      );
    } else {
      // タイムラインは2フェーズ（移動→フェード）でループ（合計 2x の所要時間）
      chevronTimeline.value = 0;
      chevronTimeline.value = withRepeat(
        withSequence(
          withTiming(1, { duration: YAMANOTE_CHEVRON_MOVE_DURATION * 2 }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );
    }
  }, [arrived]);

  // エフェクト: マウント時と到着/出発切替ごとに塗りつぶしアニメーション
  // biome-ignore lint/correctness/useExhaustiveDependencies: 到着状態の変化時のみ再実行
  useEffect(() => {
    fillHeight.value = 0;
    fillHeight.value = withTiming(windowHeight, {
      duration: YAMANOTE_LINE_BOARD_FILL_DURATION,
    });
  }, [arrived, fillHeight, windowHeight]);

  // アニメーション用スタイル
  const fillStyle = useAnimatedStyle(() => ({ height: fillHeight.value }));
  const chevronContainerStyle = useAnimatedStyle(() => {
    if (arrived) return {};
    const p = chevronTimeline.value; // サイクル全体で 0..1 の進行度
    // 前半(0..0.5): 上方向に 24px 移動、後半は維持
    const movePhase = Math.min(p / 0.5, 1); // 前半中は 0..1
    // 後半(0.5..1): 不透明度 1 → 0.2、前半は 1 を維持
    const fadePhase = Math.max((p - 0.5) / 0.5, 0); // 後半中は 0..1
    const opacity = 0.2 + (1 - fadePhase) * 0.8; // 0.2..1 の範囲
    const translateY = -movePhase * 24;
    return {
      // 既定の rotate(-20deg) を維持したまま並記（transform は配列全体が上書きされるためここで回転も指定）
      transform: [{ rotate: '-20deg' }, { translateY }],
      opacity,
    };
  });

  // AnimatedChevron不要。SharedValueを直接渡す

  const paths = useMemo(
    () => ({
      shadow: `M -4 -60 A ${windowWidth / 1.5} ${windowHeight} 0 0 1 ${
        windowWidth / 1.5 - 4
      } ${windowHeight}`,
      main: `M 0 -64 A ${windowWidth / 1.5} ${windowHeight} 0 0 1 ${
        windowWidth / 1.5
      } ${windowHeight}`,
    }),
    [windowWidth, windowHeight]
  );
  const hexLineColor = line.color ?? '#000';
  const strokeWidth = 128;

  const colorSegments = useMemo(
    () =>
      computeColorSegments(
        stations,
        trainTypeLines,
        hexLineColor,
        windowHeight
      ),
    [stations, trainTypeLines, hexLineColor, windowHeight]
  );

  const dynamicStyles = useMemo(
    () => ({
      stationNameContainer: { width: windowWidth / 4 },
      stationName: { width: windowWidth / 4 },
      clipViewStyle: { width: windowWidth },
      chevron: {
        right: windowWidth / 3.15,
        top: (4 * windowHeight) / 7 + 84,
      },
      chevronArrived: {
        top: (4 * windowHeight) / 7,
        right: windowWidth / 2.985,
      },
    }),
    [windowWidth, windowHeight]
  );

  const getDotLeft = useCallback(
    (i: number): number => {
      const leftPad = 0;
      switch (i) {
        case 0:
          return windowWidth / 3 + leftPad;
        case 1:
          return windowWidth / 2.35 + leftPad;
        case 2:
          return windowWidth / 1.975 + leftPad;
        case 3:
          return windowWidth / 1.785 + leftPad;
        case 4:
          return windowWidth / 1.655 - 3.5;
        default:
          return 0;
      }
    },
    [windowWidth]
  );

  const getStationNameLeft = useCallback(
    (i: number): number => {
      switch (i) {
        case 0:
          return windowWidth / 2.2;
        case 1:
          return windowWidth / 1.925;
        case 2:
          return windowWidth / 1.7;
        case 3:
          return windowWidth / 1.55;
        case 4:
          return windowWidth / 1.47;
        default:
          return 0;
      }
    },
    [windowWidth]
  );

  const getStationNameTop = useCallback(
    (i: number): number => {
      switch (i) {
        case 0:
          return -8;
        case 1:
          return windowHeight / 11.5;
        case 2:
          return windowHeight / 4.5;
        case 3:
          return windowHeight / 2.75;
        case 4:
          return windowHeight / 1.9;
        default:
          return 0;
      }
    },
    [windowHeight]
  );

  const getCustomDotStyle = useCallback(
    (
      i: number,
      stationsArg: Station[],
      arrivedArg: boolean,
      pass: boolean
    ): { left: number; top: number; backgroundColor: string } => {
      const dotColor =
        i === stationsArg.length - 2 && !arrivedArg && !pass
          ? '#F6BE00'
          : 'white';
      return {
        left: getDotLeft(i),
        top: !i ? windowHeight / 30 : (i * windowHeight) / 7,
        backgroundColor: dotColor,
      };
    },
    [getDotLeft, windowHeight]
  );

  const getCustomStationNameStyle = useCallback(
    (i: number): { left: number; top: number } => ({
      left: getStationNameLeft(i),
      top: getStationNameTop(i),
    }),
    [getStationNameLeft, getStationNameTop]
  );

  return (
    <>
      <Transfers
        transferLines={transferLines}
        station={station}
        lineMarks={lineMarks}
        isEn={isEn}
        windowWidth={windowWidth}
        windowHeight={windowHeight}
      />

      <Svg width={windowWidth} height={windowHeight} fill="transparent">
        <Path d={paths.shadow} stroke="#333" strokeWidth={strokeWidth} />
        <Path d={paths.main} stroke="#505a6e" strokeWidth={strokeWidth} />
      </Svg>

      {/* 暗色層: 区間ごとにViewクリッピングで色分け */}
      <Animated.View
        style={[styles.clipViewStyle, dynamicStyles.clipViewStyle, fillStyle]}
      >
        {colorSegments.map((seg) => (
          <View
            key={`dk-${seg.color}-${seg.yStart}`}
            style={{
              position: 'absolute',
              bottom: windowHeight - seg.yEnd,
              width: windowWidth,
              height: seg.yEnd - seg.yStart,
              overflow: 'hidden',
            }}
          >
            <Svg
              style={{
                position: 'absolute',
                bottom: seg.yEnd - windowHeight - ARC_SVG_Y_OFFSET,
              }}
              width={windowWidth}
              height={windowHeight}
              fill="transparent"
            >
              <Path
                d={paths.shadow}
                stroke={darken(0.3, seg.color)}
                strokeWidth={strokeWidth}
              />
            </Svg>
          </View>
        ))}
      </Animated.View>
      {/* 主色層: 区間ごとにViewクリッピングで色分け */}
      <Animated.View
        style={[styles.clipViewStyle, dynamicStyles.clipViewStyle, fillStyle]}
      >
        {colorSegments.map((seg) => (
          <View
            key={`mn-${seg.color}-${seg.yStart}`}
            style={{
              position: 'absolute',
              bottom: windowHeight - seg.yEnd,
              width: windowWidth,
              height: seg.yEnd - seg.yStart,
              overflow: 'hidden',
            }}
          >
            <Svg
              style={{
                position: 'absolute',
                bottom: seg.yEnd - windowHeight - ARC_SVG_Y_OFFSET,
              }}
              width={windowWidth}
              height={windowHeight}
              fill="transparent"
            >
              <Path
                d={paths.main}
                stroke={seg.color}
                strokeWidth={strokeWidth}
              />
            </Svg>
          </View>
        ))}
      </Animated.View>
      <Animated.View
        style={[
          styles.chevron,
          dynamicStyles.chevron,
          arrived
            ? [styles.chevronArrived, dynamicStyles.chevronArrived]
            : chevronContainerStyle,
        ]}
      >
        <ChevronYamanote backgroundScaleSV={bgScale} arrived={arrived} />
      </Animated.View>

      <View style={styles.stationNames}>
        {stations.map((s, i) =>
          s ? (
            <React.Fragment key={s.id}>
              <View
                style={[
                  styles.circle,
                  (arrived && i === stations.length - 2) || getIsPass(s)
                    ? styles.arrivedCircle
                    : undefined,
                  getCustomDotStyle(i, stations, arrived, getIsPass(s)),
                ]}
              />
              <View
                style={[
                  styles.stationNameContainer,
                  dynamicStyles.stationNameContainer,
                  getCustomStationNameStyle(i),
                ]}
              >
                {numberingInfo[i] ? (
                  <View
                    style={[
                      (numberingInfo[i] as NumberingInfo).lineMarkShape
                        .signShape === MARK_SHAPE.SQUARE
                        ? styles.numberingSquareIconContainer
                        : styles.numberingIconContainer,
                      getIsPass(s) ? styles.halfOpacity : null,
                    ]}
                  >
                    <NumberingIcon
                      shape={
                        numberingInfo[i]?.lineMarkShape?.signShape ??
                        MARK_SHAPE.NOOP
                      }
                      lineColor={numberingInfo[i]?.lineColor ?? '#000'}
                      stationNumber={numberingInfo[i]?.stationNumber ?? ''}
                      allowScaling={false}
                    />
                  </View>
                ) : (
                  <View style={styles.numberingIconPlaceholder} />
                )}

                <Typography
                  style={[
                    styles.stationName,
                    dynamicStyles.stationName,
                    getIsPass(s) ? styles.halfOpacity : null,
                  ]}
                >
                  {isEn ? s.nameRoman : s.name}
                </Typography>
              </View>
            </React.Fragment>
          ) : null
        )}
      </View>
    </>
  );
};

export default React.memo(PadArch);
