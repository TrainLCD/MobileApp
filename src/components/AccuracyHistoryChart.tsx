import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Circle, Line, Svg } from 'react-native-svg';
import { buildAccuracyChartSeries } from '~/utils/accuracyChart';
import Typography from './Typography';

type Props = {
  /** 1Hzでサンプリングした測位精度履歴(m)。無効値はNaNで積まれる想定。 */
  history: number[];
  /** 描画領域の幅(px)。 */
  width: number;
  /** 描画領域の高さ(px)。 */
  height: number;
};

// 線・点が描画領域の縁で切れないように内側に余白を取る
const HORIZONTAL_PADDING = 4;
const VERTICAL_PADDING = 6;
const DOT_RADIUS = 2.5;
const LINE_WIDTH = 1.75;

const styles = StyleSheet.create({
  placeholder: {
    color: 'rgba(148, 163, 184, 0.9)',
    fontSize: 12,
    letterSpacing: 2,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * DevOverlay の精度履歴を折れ線グラフで描画する。
 * 縦軸は測位精度で、値が大きい(精度が悪い)サンプルほど上端側に描く。
 * 各点・線分は精度帯に応じて色分けし、悪化区間を一目で把握できるようにする。
 */
const AccuracyHistoryChart: React.FC<Props> = ({ history, width, height }) => {
  const series = useMemo(() => buildAccuracyChartSeries(history), [history]);

  const points = useMemo(() => {
    if (series.length === 0 || width <= 0 || height <= 0) {
      return [];
    }
    const innerWidth = Math.max(0, width - HORIZONTAL_PADDING * 2);
    const innerHeight = Math.max(0, height - VERTICAL_PADDING * 2);
    return series.map((point, index) => ({
      // サンプルは等間隔に配置。1点のみのときは中央に置く
      x:
        HORIZONTAL_PADDING +
        (series.length === 1
          ? innerWidth / 2
          : (index / (series.length - 1)) * innerWidth),
      // normalized=1(最も精度が悪い)を上端、0(最も良い)を下端へマッピングする
      y: VERTICAL_PADDING + (1 - point.normalized) * innerHeight,
      value: point.value,
      color: point.color,
    }));
  }, [series, width, height]);

  if (points.length === 0) {
    return (
      <View
        testID="dev-overlay-accuracy-history"
        style={[styles.placeholderContainer, { width, height }]}
      >
        <Typography style={styles.placeholder}>---</Typography>
      </View>
    );
  }

  return (
    <View testID="dev-overlay-accuracy-history" style={{ width, height }}>
      <Svg width={width} height={height}>
        {points.slice(1).map((point, index) => {
          const prev = points[index];
          // 線分は両端のうち精度が悪い(値が大きい)側の色で塗り、悪化区間を強調する
          const segmentColor =
            point.value >= prev.value ? point.color : prev.color;
          return (
            <Line
              key={`segment-${index}-${point.x}-${point.y}`}
              x1={prev.x}
              y1={prev.y}
              x2={point.x}
              y2={point.y}
              stroke={segmentColor}
              strokeWidth={LINE_WIDTH}
              strokeLinecap="round"
            />
          );
        })}
        {points.map((point, index) => (
          <Circle
            key={`point-${index}-${point.x}-${point.y}`}
            testID="dev-overlay-accuracy-point"
            cx={point.x}
            cy={point.y}
            r={DOT_RADIUS}
            fill={point.color}
          />
        ))}
      </Svg>
    </View>
  );
};

export default React.memo(AccuracyHistoryChart);
