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
  type TextStyle,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { BAD_ACCURACY_THRESHOLD } from '~/constants/threshold';
import {
  useDistanceToNextStation,
  useLandscapeWindowDimensions,
  useNextStation,
} from '~/hooks';
import { useTelemetryEnabled } from '~/hooks/useTelemetryEnabled';
import { getMaxPermitAccuracy, isEtaAssistEnabled } from '~/lib/remoteConfig';
import { etaAnchorAtom, etaPhaseAtom } from '~/store/atoms/etaFallback';
import {
  backgroundLocationTrackingAtom,
  locationAtom,
  rawLocationAtom,
} from '~/store/atoms/location';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import AccuracyHistoryChart from './AccuracyHistoryChart';
import Typography from './Typography';

const EXPAND_DURATION = 280;

// 1Hzで現在の測位精度をサンプリングして履歴に積む。
// 位置情報イベントの到着有無に依存せず確実にチャートを描き換えることで、
// 「GPSが止まっているのに動いて見える」状態を視覚的に区別できるようにする。
const ACCURACY_CHART_SAMPLE_INTERVAL_MS = 1000;
const ACCURACY_CHART_LIMIT = 12;

const PANEL_BORDER = 'rgba(255,255,255,0.18)';
const PANEL_BG = 'rgba(7, 11, 24, 0.78)';
const LABEL_COLOR = 'rgba(199, 210, 254, 0.72)';
const VALUE_COLOR = '#f8fafc';
const DANGER_COLOR = '#f87171';
const WARNING_COLOR = '#facc15';
const AURORA_COLORS = [
  'rgba(56, 189, 248, 0.28)',
  'rgba(217, 70, 239, 0.2)',
] as const;

export const getDevOverlayDragTranslation = (
  dx: number,
  dy: number,
  isRotatedToLandscape: boolean
) => {
  if (isRotatedToLandscape) {
    return {
      x: -dy,
      y: -dx,
    };
  }

  return {
    x: -dx,
    y: dy,
  };
};

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
  metricValueDanger: {
    color: DANGER_COLOR,
  },
  metricValueWarning: {
    color: WARNING_COLOR,
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
  suffixStyle?: StyleProp<TextStyle>;
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
  suffixStyle,
  metaStyle,
}) => (
  <View style={[styles.metricCard, style]}>
    <View style={styles.metricHeader}>
      <Typography style={[styles.metricLabel, labelStyle]}>{label}</Typography>
      <Typography style={[styles.metricValue, valueStyle]} testID={valueTestID}>
        {value}
        {suffix && value !== '--' ? (
          <Typography style={[styles.metricSuffix, suffixStyle]}>
            {suffix}
          </Typography>
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
  // アンカーの経過秒表示用の現在時刻。レンダー中に Date.now() を直接呼ぶと純粋性違反に
  // なる(React Compilerの自動メモ化で更新されなくなる)ため、1秒間隔でstateへ取り込む。
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  // DevOverlayは診断用途のため、速度・精度ともにEMAスムージングやMAX_PERMIT_ACCURACY
  // フィルタを通らない生の測位値（rawLocationAtom）から取得する。
  // 継続測位（watch/background両経路）はhandleTrackingLocation経由でフィルタ前に
  // rawLocationAtomへ生の値を記録するため、棄却・補正された値もここから観測できる。
  const rawLocation = useAtomValue(rawLocationAtom);
  const simulatedLocation = useAtomValue(locationAtom);
  const autoModeEnabled = useAtomValue(autoModeEnabledAtom);
  // オートモード中はGPSの継続測位を停止し、useSimulationModeが速度プロファイル由来の
  // 位置・速度をlocationAtomへ直接書き込むため、rawLocationAtomは更新されない。
  // 速度・精度が0や古い値で凍結しないよう、参照元をlocationAtomへ切り替える。
  const location = autoModeEnabled ? simulatedLocation : rawLocation;
  const speed = location?.coords?.speed;
  const accuracy = location?.coords?.accuracy;
  const distanceToNextStation = useDistanceToNextStation();
  const nextStation = useNextStation(false);
  const isTelemetryEnabled = useTelemetryEnabled();
  const isBackgroundLocationTracking = useAtomValue(
    backgroundLocationTrackingAtom
  );
  // ETA補助の診断表示。有効フラグ(リモート設定/手動トグル)は非リアクティブなgetter、
  // 推定フェーズ・アンカーはatomから購読する。
  const etaAssistEnabled = isEtaAssistEnabled();
  const etaPhase = useAtomValue(etaPhaseAtom);
  const etaAnchor = useAtomValue(etaAnchorAtom);

  const coordsSpeed = ((speed ?? 0) < 0 ? 0 : speed) ?? 0;
  const accuracyMeters =
    accuracy != null ? Math.max(0, Math.floor(accuracy)) : null;
  // 最大許容精度のフィルタに関係なく生の精度を判定し、許容値を超えたら赤字で警告する。
  // 許容値は Remote Config 由来のため、フィルタ本体と同じ実効値で判定をそろえる。
  const maxPermitAccuracy = getMaxPermitAccuracy();
  const isAccuracyOverLimit = accuracy != null && accuracy > maxPermitAccuracy;
  // チャートが黄色になる精度域（BAD_ACCURACY_THRESHOLD以上・許容値以下）では
  // m表示も黄色文字にして、精度悪化を数値とチャートの双方で示す
  const isAccuracyWarning =
    accuracy != null &&
    accuracy >= BAD_ACCURACY_THRESHOLD &&
    accuracy <= maxPermitAccuracy;

  const speedKMH = useMemo(
    () =>
      (
        (speed && Math.round((coordsSpeed * 3600) / 1000)) ??
        0
      ).toLocaleString(),
    [coordsSpeed, speed]
  );

  // 最新の測位精度を ref で保持し、setInterval から常に最新値を参照できるようにする
  const latestAccuracyRef = useRef<number | null | undefined>(accuracy);
  useEffect(() => {
    latestAccuracyRef.current = accuracy;
  }, [accuracy]);

  const [chartHistory, setChartHistory] = useState<number[]>([]);

  useEffect(() => {
    const pushSample = () => {
      const current = latestAccuracyRef.current;
      // 無効値(null/NaN/負値)は NaN を積み、generateAccuracyChart 側で除外させる。
      // 位置情報が取れない状態が続くとチャートが自然に痩せていき、停止が一目で分かる。
      const sample =
        current != null && Number.isFinite(current) && current >= 0
          ? current
          : Number.NaN;
      setChartHistory((prev) => [...prev, sample].slice(-ACCURACY_CHART_LIMIT));
    };
    pushSample();
    const id = setInterval(pushSample, ACCURACY_CHART_SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const versionLabel = `TrainLCD DO ${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`;
  const telemetryValue = isTelemetryEnabled ? 'ON' : 'OFF';
  const backgroundValue = isBackgroundLocationTracking ? 'ON' : 'OFF';
  // ETA推定フェーズ(RUNNING/APPROACHING/DWELLING)を表示。フェーズ未推定時は IDLE。
  const etaFallbackValue = etaPhase?.kind ?? 'IDLE';
  // 推定対象の駅ID(走行/接近中は目標駅、停車中は当該駅)。
  const etaPhaseTargetId =
    etaPhase == null
      ? null
      : etaPhase.kind === 'DWELLING'
        ? etaPhase.stationId
        : etaPhase.targetStationId;
  // メタ行に有効フラグ(リモート設定の配信状態)と対象駅を出す。
  const etaFallbackMeta = `assist ${etaAssistEnabled ? 'ON' : 'OFF'}${
    etaPhaseTargetId != null ? ` / #${etaPhaseTargetId}` : ''
  }`;
  // ETA仮想時計の起点(アンカー)。フォールバックが正しい駅から時計を進めているかを
  // 確認できるよう、種別(到着中/発車)・起点駅ID・観測からの経過秒を出す。
  // 経過秒は nowTick(1秒間隔で更新するstate)から導出する。
  const etaAnchorValue = etaAnchor
    ? etaAnchor.kind === 'AT_STATION'
      ? 'AT STOP'
      : 'DEPARTED'
    : '--';
  const etaAnchorAgeSec = etaAnchor
    ? Math.max(0, Math.round((nowTick - etaAnchor.observedAtMs) / 1000))
    : null;
  const etaAnchorMeta = etaAnchor
    ? `#${etaAnchor.stationId} · ${etaAnchorAgeSec}s ago`
    : 'no anchor';
  const nextStationNumber =
    nextStation?.stationNumbers?.find((item) => !!item?.stationNumber)
      ?.stationNumber ?? undefined;
  const nextStationMeta = [nextStation?.name, nextStationNumber]
    .filter(Boolean)
    .join(' / ');

  const dim = useLandscapeWindowDimensions();
  const physicalDim = useWindowDimensions();
  const [basePosition, setBasePosition] = useState({ x: 0, y: 0 });
  const isLandscape = dim.width > dim.height;
  const isRotatedToLandscape = physicalDim.height > physicalDim.width;
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
  const metricsGap = isLandscape ? 8 : 10;
  // すべてのボックスを2列・均一幅に揃える。横画面はチャートも含めて2列×3段
  // (チャート/NEXT・精度/速度・FALLBACK/ANCHOR)、縦画面もメトリクスカードを
  // 同じ幅に揃える(チャートのみ単独で全幅)。
  const boxWidth = (contentWidth - metricsGap) / 2;
  const chartColumnWidth = isLandscape ? boxWidth : panelWidth;
  const metricWidth = boxWidth;
  const nextCardWidth = boxWidth;
  const leftMetricWidth = boxWidth;
  // 折れ線グラフの描画サイズ。chartShellの内側(paddingHorizontal分を差し引いた幅)に収める
  const accuracyChartWidth = isLandscape
    ? chartColumnWidth - 20
    : contentWidth - 24;
  const accuracyChartHeight = isLandscape ? 30 : 40;
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

  const resolvedExpandedHeight =
    expandedHeight > 0 ? expandedHeight : collapsedHeight;

  const animatedWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedPanelWidth, panelWidth],
  });
  const animatedHeight = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedHeight, resolvedExpandedHeight],
  });

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
    const currentHeight = isExpanded ? resolvedExpandedHeight : collapsedHeight;

    const nextPosition = hasDraggedRef.current
      ? clampPosition(
          basePositionRef.current.x,
          basePositionRef.current.y,
          currentWidth,
          currentHeight
        )
      : initialPosition;

    setBasePosition(nextPosition);
    dragTranslation.setValue({ x: 0, y: 0 });
  }, [
    clampPosition,
    isLandscape,
    panelWidth,
    isExpanded,
    dragTranslation,
    resolvedExpandedHeight,
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
            dragTranslation.setValue(
              getDevOverlayDragTranslation(
                gestureState.dx,
                gestureState.dy,
                isRotatedToLandscape
              )
            );
          }
        },
        onPanResponderRelease: () => {
          if (!isDraggingRef.current) {
            hasDraggedRef.current = true;
            setIsExpanded((prev) => !prev);
            return;
          }
          const currentWidth = isExpanded ? panelWidth : collapsedPanelWidth;
          const currentHeight = isExpanded
            ? resolvedExpandedHeight
            : collapsedHeight;
          dragTranslation.stopAnimation((value) => {
            const clampedPosition = clampPosition(
              basePositionRef.current.x + value.x,
              basePositionRef.current.y + value.y,
              currentWidth,
              currentHeight
            );
            hasDraggedRef.current = true;
            setBasePosition(clampedPosition);
            dragTranslation.setValue({ x: 0, y: 0 });
          });
        },
        onPanResponderTerminate: () => {
          const currentWidth = isExpanded ? panelWidth : collapsedPanelWidth;
          const currentHeight = isExpanded
            ? resolvedExpandedHeight
            : collapsedHeight;
          dragTranslation.stopAnimation((value) => {
            const clampedPosition = clampPosition(
              basePositionRef.current.x + value.x,
              basePositionRef.current.y + value.y,
              currentWidth,
              currentHeight
            );
            hasDraggedRef.current = true;
            setBasePosition(clampedPosition);
            dragTranslation.setValue({ x: 0, y: 0 });
          });
        },
      }),
    [
      clampPosition,
      dragTranslation,
      panelWidth,
      isExpanded,
      resolvedExpandedHeight,
      isRotatedToLandscape,
    ]
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
                        <AccuracyHistoryChart
                          history={chartHistory}
                          width={accuracyChartWidth}
                          height={accuracyChartHeight}
                        />
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
                    valueStyle={[
                      metricValueStyle,
                      isAccuracyWarning && styles.metricValueWarning,
                      isAccuracyOverLimit && styles.metricValueDanger,
                    ]}
                    suffixStyle={
                      isAccuracyOverLimit
                        ? styles.metricValueDanger
                        : isAccuracyWarning
                          ? styles.metricValueWarning
                          : null
                    }
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

                <View style={styles.landscapeSubGrid}>
                  <MetricCard
                    label="ETA FALLBACK"
                    value={etaFallbackValue}
                    meta={etaFallbackMeta}
                    style={[{ width: leftMetricWidth }, metricCardStyle]}
                    valueTestID="dev-overlay-eta-fallback-value"
                    metaTestID="dev-overlay-eta-fallback-meta"
                    labelStyle={metricLabelStyle}
                    valueStyle={[
                      metricValueStyle,
                      etaPhase != null && styles.metricValueWarning,
                    ]}
                    metaStyle={metricMetaStyle}
                  />
                  <MetricCard
                    label="ETA ANCHOR"
                    value={etaAnchorValue}
                    meta={etaAnchorMeta}
                    style={[{ width: leftMetricWidth }, metricCardStyle]}
                    valueTestID="dev-overlay-eta-anchor-value"
                    metaTestID="dev-overlay-eta-anchor-meta"
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
                    <AccuracyHistoryChart
                      history={chartHistory}
                      width={accuracyChartWidth}
                      height={accuracyChartHeight}
                    />
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
                    valueStyle={[
                      metricValueStyle,
                      isAccuracyWarning && styles.metricValueWarning,
                      isAccuracyOverLimit && styles.metricValueDanger,
                    ]}
                    suffixStyle={
                      isAccuracyOverLimit
                        ? styles.metricValueDanger
                        : isAccuracyWarning
                          ? styles.metricValueWarning
                          : null
                    }
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
                  <MetricCard
                    label="ETA FALLBACK"
                    value={etaFallbackValue}
                    meta={etaFallbackMeta}
                    style={[{ width: metricWidth }, metricCardStyle]}
                    valueTestID="dev-overlay-eta-fallback-value"
                    metaTestID="dev-overlay-eta-fallback-meta"
                    labelStyle={metricLabelStyle}
                    valueStyle={[
                      metricValueStyle,
                      etaPhase != null && styles.metricValueWarning,
                    ]}
                    metaStyle={metricMetaStyle}
                  />
                  <MetricCard
                    label="ETA ANCHOR"
                    value={etaAnchorValue}
                    meta={etaAnchorMeta}
                    style={[{ width: metricWidth }, metricCardStyle]}
                    valueTestID="dev-overlay-eta-anchor-value"
                    metaTestID="dev-overlay-eta-anchor-meta"
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
