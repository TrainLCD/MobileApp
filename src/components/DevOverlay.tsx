import * as Application from 'expo-application';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useDistanceToNextStation, useNextStation } from '~/hooks';
import { useTelemetryEnabled } from '~/hooks/useTelemetryEnabled';
import {
  accuracyHistoryAtom,
  backgroundLocationTrackingAtom,
  locationAtom,
} from '~/store/atoms/location';
import { generateAccuracyChart } from '~/utils/accuracyChart';
import Typography from './Typography';

const EXPAND_DURATION = 280;

const PANEL_BORDER = 'rgba(255,255,255,0.18)';
const PANEL_BG = 'rgba(7, 11, 24, 0.78)';
const LABEL_COLOR = 'rgba(199, 210, 254, 0.72)';
const VALUE_COLOR = '#f8fafc';
const AURORA_COLORS = [
  'rgba(56, 189, 248, 0.28)',
  'rgba(217, 70, 239, 0.2)',
] as const;

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 9999,
    overflow: 'hidden',
    shadowColor: '#020617',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  panelFrame: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: PANEL_BG,
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.2,
    color: 'rgba(191, 219, 254, 0.78)',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  version: {
    color: 'rgba(226, 232, 240, 0.72)',
    fontSize: 11,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
    alignItems: 'center',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    minWidth: 72,
  },
  statusLabel: {
    color: 'rgba(226, 232, 240, 0.78)',
    fontSize: 8,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  statusValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  chartShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.16)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  chartShellContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  chartLabel: {
    color: LABEL_COLOR,
    fontSize: 9,
    letterSpacing: 1.6,
  },
  chartValue: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    minHeight: 82,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    backgroundColor: 'rgba(9, 14, 28, 0.7)',
    justifyContent: 'flex-start',
    gap: 6,
  },
  metricLabel: {
    color: LABEL_COLOR,
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  metricValue: {
    color: VALUE_COLOR,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  metricSuffix: {
    color: 'rgba(191, 219, 254, 0.78)',
    fontSize: 11,
    fontWeight: '500',
  },
  metricMeta: {
    color: 'rgba(226, 232, 240, 0.72)',
    fontSize: 11,
    lineHeight: 14,
  },
  metricHeader: {
    gap: 2,
  },
  footerText: {
    color: 'rgba(148, 163, 184, 0.92)',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  bodyRow: {
    gap: 10,
  },
  landscapeBodyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  chartColumn: {
    gap: 10,
  },
  landscapeTopRow: {
    flexDirection: 'row',
    gap: 8,
  },
  landscapeSubGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  collapsedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: PANEL_BG,
    overflow: 'hidden',
  },
  collapsedTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

type StatusPillProps = {
  label: string;
  value: 'ON' | 'OFF';
  style?: StyleProp<ViewStyle>;
};

type MetricCardProps = {
  label: string;
  value: string;
  suffix?: string;
  meta?: string;
  valueTestID?: string;
  metaTestID?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
  metaStyle?: StyleProp<TextStyle>;
};

const StatusPill: React.FC<StatusPillProps> = ({ label, value, style }) => {
  const isOn = value === 'ON';
  const colors = isOn
    ? (['rgba(34,197,94,0.32)', 'rgba(14,165,233,0.2)'] as const)
    : (['rgba(71,85,105,0.34)', 'rgba(30,41,59,0.34)'] as const);

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.statusPill,
        style,
        {
          borderColor: isOn ? 'rgba(74, 222, 128, 0.38)' : PANEL_BORDER,
        },
      ]}
    >
      <Typography style={styles.statusLabel}>{label}</Typography>
      <Typography style={styles.statusValue}>{value}</Typography>
    </LinearGradient>
  );
};

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  suffix,
  meta,
  valueTestID,
  metaTestID,
  style,
  labelStyle,
  valueStyle,
  metaStyle,
}) => (
  <View style={[styles.metricCard, style]}>
    <View style={styles.metricHeader}>
      <Typography style={[styles.metricLabel, labelStyle]}>{label}</Typography>
      <Typography style={[styles.metricValue, valueStyle]} testID={valueTestID}>
        {value}
        {suffix && value !== '--' ? (
          <Typography style={styles.metricSuffix}>{suffix}</Typography>
        ) : null}
      </Typography>
    </View>
    {meta ? (
      <Typography style={[styles.metricMeta, metaStyle]} testID={metaTestID}>
        {meta}
      </Typography>
    ) : null}
  </View>
);

const DevOverlay: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState(0);
  const location = useAtomValue(locationAtom);
  const speed = location?.coords?.speed;
  const accuracy = location?.coords?.accuracy;
  const accuracyHistory = useAtomValue(accuracyHistoryAtom);
  const distanceToNextStation = useDistanceToNextStation();
  const nextStation = useNextStation(false);
  const isTelemetryEnabled = useTelemetryEnabled();
  const isBackgroundLocationTracking = useAtomValue(
    backgroundLocationTrackingAtom
  );

  const coordsSpeed = ((speed ?? 0) < 0 ? 0 : speed) ?? 0;
  const accuracyMeters =
    accuracy != null ? Math.max(0, Math.floor(accuracy)) : null;

  const speedKMH = useMemo(
    () =>
      (
        (speed && Math.round((coordsSpeed * 3600) / 1000)) ??
        0
      ).toLocaleString(),
    [coordsSpeed, speed]
  );

  const accuracyChartBlocks = useMemo(
    () => generateAccuracyChart(accuracyHistory),
    [accuracyHistory]
  );

  const versionLabel = `TrainLCD DO ${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`;
  const telemetryValue = isTelemetryEnabled ? 'ON' : 'OFF';
  const backgroundValue = isBackgroundLocationTracking ? 'ON' : 'OFF';
  const nextStationNumber =
    nextStation?.stationNumbers?.find((item) => !!item?.stationNumber)
      ?.stationNumber ?? undefined;
  const nextStationMeta = [nextStation?.name, nextStationNumber]
    .filter(Boolean)
    .join(' / ');

  const dim = useWindowDimensions();
  const [basePosition, setBasePosition] = useState({ x: 0, y: 0 });
  const isLandscape = dim.width > dim.height;
  const panelWidth = isLandscape
    ? Math.min(Math.max(dim.width * 0.29, 360), 520)
    : Math.min(Math.max(dim.width * 0.34, 280), 430);
  const collapsedPanelWidth = 160;
  const compactSpacing = isLandscape ? 10 : 12;
  const compactPaddingX = isLandscape ? 12 : 16;
  const compactPaddingY = isLandscape ? 12 : 14;
  const compactRadius = isLandscape ? 20 : 24;
  const headerTitleStyle = isLandscape
    ? { fontSize: 13, lineHeight: 17 }
    : null;
  const versionStyle = isLandscape ? { fontSize: 10 } : null;
  const chartShellStyle = isLandscape
    ? {
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 6,
        borderRadius: 16,
        minHeight: 64,
      }
    : null;
  const chartValueStyle = isLandscape ? { fontSize: 12, lineHeight: 15 } : null;
  const metricCardStyle = isLandscape
    ? {
        minHeight: 56,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingTop: 6,
        paddingBottom: 4,
      }
    : null;
  const metricLabelStyle = isLandscape
    ? { fontSize: 8, marginBottom: 4, letterSpacing: 1.2 }
    : null;
  const metricValueStyle = isLandscape
    ? { fontSize: 15, lineHeight: 18 }
    : null;
  const metricMetaStyle = isLandscape ? { fontSize: 10, lineHeight: 12 } : null;
  const statusRowStyle = isLandscape ? { gap: 6 } : null;
  const statusPillStyle = isLandscape
    ? { minWidth: 60, paddingHorizontal: 8, paddingVertical: 5 }
    : null;
  const footerTextStyle = isLandscape ? { fontSize: 9 } : null;
  const bodyRowStyle = isLandscape ? styles.landscapeBodyRow : null;
  const contentWidth = panelWidth - compactPaddingX * 2;
  const chartColumnWidth = isLandscape ? panelWidth * 0.4 : panelWidth;
  const metricsGap = isLandscape ? 8 : 10;
  const metricsColumnWidth = isLandscape
    ? contentWidth - chartColumnWidth - metricsGap
    : contentWidth;
  const metricWidth = (metricsColumnWidth - metricsGap) / 2;
  const nextCardWidth = metricsColumnWidth;
  const leftMetricWidth = metricWidth;
  const nextTargetCardStyle: ViewStyle = {
    justifyContent: 'flex-start',
    gap: 6,
  };

  const collapsedHeight = 44;

  const animatedProgress = useRef(new Animated.Value(0)).current;
  const dragTranslation = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const basePositionRef = useRef(basePosition);
  const hasDraggedRef = useRef(false);
  const isDraggingRef = useRef(false);

  const animatedWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedPanelWidth, panelWidth],
  });
  const animatedHeight =
    expandedHeight > 0
      ? animatedProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [collapsedHeight, expandedHeight],
        })
      : undefined;

  // 縮小ラベルは展開開始ですぐフェードアウト
  const collapsedLabelOpacity = animatedProgress.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  // フルコンテンツはオーバーレイが消えてからフェードイン
  const contentOpacity = animatedProgress.interpolate({
    inputRange: [0, 0.3],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    basePositionRef.current = basePosition;
  }, [basePosition]);

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: isExpanded ? 1 : 0,
      duration: EXPAND_DURATION,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animatedProgress]);

  const clampPosition = useMemo(
    () => (rightOffset: number, y: number, width: number, height: number) => {
      const margin = isLandscape ? 8 : 12;
      const maxRight = Math.max(margin, dim.width - width - margin);
      const maxY = Math.max(margin, dim.height - height - margin);

      return {
        x: Math.min(Math.max(rightOffset, margin), maxRight),
        y: Math.min(Math.max(y, margin), maxY),
      };
    },
    [dim.height, dim.width, isLandscape]
  );

  useEffect(() => {
    const margin = isLandscape ? 8 : 12;
    const initialPosition = {
      x: margin,
      y: margin,
    };
    const currentWidth = isExpanded ? panelWidth : collapsedPanelWidth;
    const currentHeight = isExpanded ? expandedHeight : collapsedHeight;

    const nextPosition = hasDraggedRef.current
      ? clampPosition(
          basePositionRef.current.x,
          basePositionRef.current.y,
          currentWidth,
          currentHeight || 0
        )
      : initialPosition;

    setBasePosition(nextPosition);
    dragTranslation.setValue({ x: 0, y: 0 });
  }, [
    clampPosition,
    isLandscape,
    expandedHeight,
    panelWidth,
    isExpanded,
    dragTranslation,
  ]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
        onPanResponderGrant: () => {
          isDraggingRef.current = false;
          dragTranslation.stopAnimation();
          dragTranslation.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: (_event, gestureState) => {
          if (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4) {
            isDraggingRef.current = true;
          }
          if (isDraggingRef.current) {
            // right基準なのでdxを反転
            dragTranslation.setValue({
              x: -gestureState.dx,
              y: gestureState.dy,
            });
          }
        },
        onPanResponderRelease: () => {
          if (!isDraggingRef.current) {
            hasDraggedRef.current = true;
            setIsExpanded((prev) => !prev);
            return;
          }
          const currentWidth = isExpanded ? panelWidth : collapsedPanelWidth;
          const currentHeight = isExpanded ? expandedHeight : collapsedHeight;
          dragTranslation.stopAnimation((value) => {
            const clampedPosition = clampPosition(
              basePositionRef.current.x + value.x,
              basePositionRef.current.y + value.y,
              currentWidth,
              currentHeight || 0
            );
            hasDraggedRef.current = true;
            setBasePosition(clampedPosition);
            dragTranslation.setValue({ x: 0, y: 0 });
          });
        },
        onPanResponderTerminate: () => {
          const currentWidth = isExpanded ? panelWidth : collapsedPanelWidth;
          const currentHeight = isExpanded ? expandedHeight : collapsedHeight;
          dragTranslation.stopAnimation((value) => {
            const clampedPosition = clampPosition(
              basePositionRef.current.x + value.x,
              basePositionRef.current.y + value.y,
              currentWidth,
              currentHeight || 0
            );
            hasDraggedRef.current = true;
            setBasePosition(clampedPosition);
            dragTranslation.setValue({ x: 0, y: 0 });
          });
        },
      }),
    [clampPosition, dragTranslation, expandedHeight, panelWidth, isExpanded]
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.root,
        {
          width: animatedWidth,
          height: animatedHeight,
          right: basePosition.x,
          top: basePosition.y,
          borderRadius: compactRadius,
        },
        {
          transform: [
            {
              translateX: Animated.multiply(dragTranslation.x, -1),
            },
            { translateY: dragTranslation.y },
          ],
        },
      ]}
    >
      <Animated.View
        onLayout={(event) => {
          const h = event.nativeEvent.layout.height;
          if (h > 0 && h !== expandedHeight) {
            setExpandedHeight(h);
          }
        }}
        style={[
          styles.panelFrame,
          {
            width: panelWidth,
            borderRadius: compactRadius,
            opacity: contentOpacity,
          },
        ]}
      >
        <LinearGradient
          colors={AURORA_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chrome}
        />
        <View
          style={[
            styles.content,
            {
              paddingHorizontal: compactPaddingX,
              paddingVertical: compactPaddingY,
              gap: compactSpacing,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Typography style={styles.eyebrow}>DEV OVERLAY</Typography>
              <Typography style={[styles.title, headerTitleStyle]}>
                TrainLCD Diagnostics
              </Typography>
              <Typography style={[styles.version, versionStyle]}>
                {versionLabel}
              </Typography>
            </View>
            <View style={[styles.statusRow, statusRowStyle]}>
              <StatusPill
                label="TELEMETRY"
                value={telemetryValue}
                style={statusPillStyle}
              />
              <StatusPill
                label="BG LOC"
                value={backgroundValue}
                style={statusPillStyle}
              />
            </View>
          </View>

          <View style={[styles.bodyRow, bodyRowStyle]}>
            {isLandscape ? (
              <View style={styles.chartColumn} testID="dev-overlay-landscape">
                <View style={styles.landscapeTopRow}>
                  <View style={{ width: chartColumnWidth }}>
                    <View style={[styles.chartShell, chartShellStyle]}>
                      <View style={styles.chartShellContent}>
                        <Typography style={styles.chartLabel}>
                          ACCURACY HISTORY
                        </Typography>
                        <Typography
                          style={[styles.chartValue, chartValueStyle]}
                          testID="dev-overlay-accuracy-history"
                          numberOfLines={1}
                          ellipsizeMode="clip"
                        >
                          {accuracyChartBlocks.length === 0
                            ? '---'
                            : accuracyChartBlocks.map((block, index) => (
                                <Text
                                  key={`${index}-${block.char}-${block.color}`}
                                  style={{ color: block.color }}
                                >
                                  {block.char}
                                </Text>
                              ))}
                        </Typography>
                      </View>
                    </View>
                  </View>
                  <MetricCard
                    label="NEXT TARGET"
                    value={
                      distanceToNextStation ? `${distanceToNextStation}m` : '--'
                    }
                    meta={nextStationMeta}
                    style={[
                      { width: nextCardWidth },
                      metricCardStyle,
                      nextTargetCardStyle,
                    ]}
                    valueTestID="dev-overlay-next-value"
                    metaTestID="dev-overlay-next-meta"
                    labelStyle={metricLabelStyle}
                    valueStyle={metricValueStyle}
                    metaStyle={metricMetaStyle}
                  />
                </View>

                <View style={styles.landscapeSubGrid}>
                  <MetricCard
                    label="LOCATION ACCURACY"
                    value={accuracyMeters != null ? `${accuracyMeters}` : '--'}
                    suffix="m"
                    style={[{ width: leftMetricWidth }, metricCardStyle]}
                    valueTestID="dev-overlay-accuracy-value"
                    labelStyle={metricLabelStyle}
                    valueStyle={metricValueStyle}
                    metaStyle={metricMetaStyle}
                  />
                  <MetricCard
                    label="CURRENT SPEED"
                    value={speedKMH}
                    suffix="km/h"
                    style={[{ width: leftMetricWidth }, metricCardStyle]}
                    valueTestID="dev-overlay-speed-value"
                    labelStyle={metricLabelStyle}
                    valueStyle={metricValueStyle}
                    metaStyle={metricMetaStyle}
                  />
                </View>

                <Typography style={[styles.footerText, footerTextStyle]}>
                  LIVE SENSOR TRACE / INTERNAL BUILD
                </Typography>
              </View>
            ) : (
              <View style={styles.chartColumn}>
                <View style={[styles.chartShell, chartShellStyle]}>
                  <View style={styles.chartShellContent}>
                    <Typography style={styles.chartLabel}>
                      ACCURACY HISTORY
                    </Typography>
                    <Typography
                      style={[styles.chartValue, chartValueStyle]}
                      testID="dev-overlay-accuracy-history"
                      numberOfLines={1}
                      ellipsizeMode="clip"
                    >
                      {accuracyChartBlocks.length === 0
                        ? '---'
                        : accuracyChartBlocks.map((block, index) => (
                            <Text
                              key={`${index}-${block.char}-${block.color}`}
                              style={{ color: block.color }}
                            >
                              {block.char}
                            </Text>
                          ))}
                    </Typography>
                  </View>
                </View>

                <View style={[styles.metricsGrid, { gap: metricsGap }]}>
                  <MetricCard
                    label="LOCATION ACCURACY"
                    value={accuracyMeters != null ? `${accuracyMeters}` : '--'}
                    suffix="m"
                    style={[{ width: metricWidth }, metricCardStyle]}
                    valueTestID="dev-overlay-accuracy-value"
                    labelStyle={metricLabelStyle}
                    valueStyle={metricValueStyle}
                    metaStyle={metricMetaStyle}
                  />
                  <MetricCard
                    label="CURRENT SPEED"
                    value={speedKMH}
                    suffix="km/h"
                    style={[{ width: metricWidth }, metricCardStyle]}
                    valueTestID="dev-overlay-speed-value"
                    labelStyle={metricLabelStyle}
                    valueStyle={metricValueStyle}
                    metaStyle={metricMetaStyle}
                  />
                  <MetricCard
                    label="NEXT TARGET"
                    value={
                      distanceToNextStation ? `${distanceToNextStation}m` : '--'
                    }
                    meta={nextStationMeta}
                    style={[
                      { width: nextCardWidth },
                      metricCardStyle,
                      nextTargetCardStyle,
                    ]}
                    valueTestID="dev-overlay-next-value"
                    metaTestID="dev-overlay-next-meta"
                    labelStyle={metricLabelStyle}
                    valueStyle={metricValueStyle}
                    metaStyle={metricMetaStyle}
                  />
                </View>
              </View>
            )}
          </View>

          {!isLandscape ? (
            <Typography style={[styles.footerText, footerTextStyle]}>
              LIVE SENSOR TRACE / INTERNAL BUILD
            </Typography>
          ) : null}
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.collapsedOverlay,
          {
            opacity: collapsedLabelOpacity,
            borderRadius: compactRadius,
          },
        ]}
        pointerEvents={isExpanded ? 'none' : 'auto'}
      >
        <LinearGradient
          colors={AURORA_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFillObject,
            { borderRadius: compactRadius },
          ]}
        />
        <Typography style={styles.collapsedTitle}>TrainLCD DO</Typography>
      </Animated.View>
    </Animated.View>
  );
};

export default React.memo(DevOverlay);
