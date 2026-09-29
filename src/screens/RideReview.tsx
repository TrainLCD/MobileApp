import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useAtomValue, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Animated as RNAnimated,
  type ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '~/components/Button';
import FooterTabBar, { useFooterHeight } from '~/components/FooterTabBar';
import { Heading } from '~/components/Heading';
import {
  RideRouteMapView,
  useRideRouteMapBackgroundColor,
} from '~/components/RideRouteMapView';
import { SettingsHeader } from '~/components/SettingsHeader';
import Typography from '~/components/Typography';
import WalkthroughOverlay, {
  type WalkthroughStep,
  type WalkthroughStepId,
} from '~/components/WalkthroughOverlay';
import { STORAGE_KEYS } from '~/constants';
import { useRideReviewWalkthrough } from '~/hooks/useRideReviewWalkthrough';
import { useRideStats } from '~/hooks/useRideStats';
import { storage } from '~/lib/storage';
import { useAppColors } from '~/providers/AppColorsProvider';
import { rideLogEnabledAtom } from '~/store/atoms/rideLog';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { showDialog } from '~/utils/dialogPresentation';
import type { RideRoutes } from '~/utils/rideRoutes';
import type { RidePeriod, RideStats, RideStatsBucket } from '~/utils/rideStats';
import {
  formatDistanceKm,
  formatDuration,
  formatMonthDay,
  formatRange,
} from '~/utils/rideStatsFormat';

const ACCENT_COLOR = '#0A84FF';
const CHART_HEIGHT = 96;
const ROUTE_MAP_HEIGHT = 200;
const EMPTY_BAR_HEIGHT = 2;
const TOP_LINES_LIMIT = 5;
const PERIODS: RidePeriod[] = ['week', 'month', 'year'];
// ウォークスルーで切り抜くカードを、見出しのすぐ下(この余白をあけた位置)までスクロールする
const WALKTHROUGH_TARGET_MARGIN = 16;
// スクロールが止まってから位置を測り直すまでの待ち時間(ms)
const WALKTHROUGH_SCROLL_SETTLE_MS = 400;
// 吹き出しの高さの見積もり。切り抜きの下に収まらなければ上に出す
const WALKTHROUGH_TOOLTIP_SPACE = 220;
// 切り抜きの角丸。期間の切り替えは segment の角丸に、ほかはカードの角丸に合わせる
const WALKTHROUGH_RADIUS: Partial<Record<WalkthroughStepId, number>> = {
  rideReviewPeriod: 20,
};
const WALKTHROUGH_CARD_RADIUS = 12;

type WalkthroughTargetRefs = Record<
  | 'rideReviewPeriod'
  | 'rideReviewSummary'
  | 'rideReviewRouteMap'
  | 'rideReviewTopLines',
  React.RefObject<View | null>
>;

const PERIOD_LABEL_KEYS: Record<RidePeriod, string> = {
  week: 'rideReviewPeriodWeek',
  month: 'rideReviewPeriodMonth',
  year: 'rideReviewPeriodYear',
};

const CHART_TITLE_KEYS: Record<RidePeriod, string> = {
  week: 'rideReviewChartWeek',
  month: 'rideReviewChartMonth',
  year: 'rideReviewChartYear',
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flexGrow: 1,
    marginHorizontal: 24,
    marginTop: 24,
    gap: 16,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 20,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 16,
  },
  segmentText: { fontSize: 14, fontWeight: 'bold' },
  rangeText: { fontSize: 16, fontWeight: 'bold' },
  card: { padding: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: 'bold' },
  distanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  distanceValue: { fontSize: 44, fontWeight: 'bold' },
  distanceUnit: { fontSize: 21, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  statsColumn: { flex: 1, gap: 4 },
  statsValue: { fontSize: 24, fontWeight: 'bold' },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: 3,
  },
  chartBar: { flex: 1, borderRadius: 3 },
  chartLabels: { flexDirection: 'row', gap: 3 },
  chartLabel: { flex: 1, fontSize: 10, textAlign: 'center' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineColor: { width: 6, height: 44, borderRadius: 3 },
  lineBody: { flex: 1, gap: 6 },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  lineName: { flexShrink: 1, fontSize: 16, fontWeight: 'bold' },
  lineValue: { fontSize: 12 },
  lineTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  lineFill: { height: 4, borderRadius: 2 },
  note: { fontSize: 11, lineHeight: 16 },
  routeMap: {
    height: ROUTE_MAP_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  routeMapExpand: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  routeMapEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  routeMapEmptyText: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 20,
    textAlign: 'center',
  },
  bodyText: { fontSize: 14, lineHeight: 21 },
  point: { flexDirection: 'row', gap: 8 },
  pointBullet: { fontSize: 12, lineHeight: 18 },
  pointText: { flex: 1, fontSize: 12, lineHeight: 18 },
  enableButton: { alignSelf: 'center', minWidth: 160, marginTop: 8 },
  loading: { marginTop: 24 },
  // 見出しとカードを1つの切り抜きにまとめる。content の gap と同じ間隔をあける
  walkthroughGroup: { gap: 16 },
});

// グラフの下に並べるラベル。今週は曜日の下に日付を添える
const bucketLabel = (
  period: RidePeriod,
  bucket: RideStatsBucket,
  index: number,
  count: number
): string => {
  switch (period) {
    case 'week': {
      const weekday = translate('rideReviewWeekdays').split(',')[index] ?? '';
      return `${weekday}\n${formatMonthDay(bucket.start)}`;
    }
    case 'month': {
      // 日ごとは数が多いので、1日・10日・20日・末日だけ出す
      const day = bucket.start.getDate();
      return day === 1 || day === 10 || day === 20 || index === count - 1
        ? String(day)
        : '';
    }
    case 'year': {
      const month = bucket.start.getMonth() + 1;
      return month === 1 || month === 6 || month === 12
        ? translate('rideReviewMonthLabel', { month })
        : '';
    }
  }
};

// 読み上げ用のラベル。グラフの目盛りと違い、どの棒にも日付(年は月)を付ける
const bucketAccessibilityLabel = (
  period: RidePeriod,
  bucket: RideStatsBucket,
  index: number
): string => {
  switch (period) {
    case 'week': {
      const weekday = translate('rideReviewWeekdays').split(',')[index] ?? '';
      return `${formatMonthDay(bucket.start)} ${weekday}`;
    }
    case 'month':
      return formatMonthDay(bucket.start);
    case 'year':
      return translate('rideReviewMonthLabel', {
        month: bucket.start.getMonth() + 1,
      });
  }
};

const Card = ({ children }: { children: React.ReactNode }) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isLEDTheme ? '#333' : colors.card,
          borderRadius: isLEDTheme ? 0 : 12,
        },
      ]}
    >
      {children}
    </View>
  );
};

const PeriodSegment = ({
  value,
  onChange,
}: {
  value: RidePeriod;
  onChange: (period: RidePeriod) => void;
}) => {
  const colors = useAppColors();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.segment, { backgroundColor: colors.border }]}
    >
      {PERIODS.map((period) => {
        const selected = period === value;
        return (
          <Pressable
            key={period}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(period)}
            style={[
              styles.segmentItem,
              selected && { backgroundColor: colors.text },
            ]}
          >
            <Typography
              style={[
                styles.segmentText,
                {
                  color: selected ? colors.background : colors.secondaryText,
                },
              ]}
            >
              {translate(PERIOD_LABEL_KEYS[period])}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
};

const SummaryCard = ({ stats }: { stats: RideStats }) => {
  const colors = useAppColors();
  return (
    <Card>
      <Typography style={[styles.label, { color: colors.secondaryText }]}>
        {translate('rideReviewTotalDistance')}
      </Typography>
      <View style={styles.distanceRow}>
        <Typography style={styles.distanceValue} testID="ride-review-distance">
          {formatDistanceKm(stats.distanceMeters)}
        </Typography>
        <Typography style={styles.distanceUnit}>km</Typography>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statsColumn}>
          <Typography style={[styles.label, { color: colors.secondaryText }]}>
            {translate('rideReviewTotalDuration')}
          </Typography>
          <Typography style={styles.statsValue} testID="ride-review-duration">
            {formatDuration(stats.durationMs)}
          </Typography>
        </View>
        <View style={styles.statsColumn}>
          <Typography style={[styles.label, { color: colors.secondaryText }]}>
            {translate('rideReviewRideCount')}
          </Typography>
          <Typography style={styles.statsValue} testID="ride-review-count">
            {translate('rideReviewRideCountValue', { count: stats.rideCount })}
          </Typography>
        </View>
      </View>
    </Card>
  );
};

const DistanceChart = ({
  period,
  buckets,
}: {
  period: RidePeriod;
  buckets: RideStatsBucket[];
}) => {
  const colors = useAppColors();
  const max = Math.max(...buckets.map((b) => b.distanceMeters), 0);
  return (
    <Card>
      <Typography style={styles.cardTitle}>
        {translate(CHART_TITLE_KEYS[period])}
      </Typography>
      <View style={styles.chart} testID="ride-review-chart">
        {buckets.map((bucket, index) => {
          const height =
            max > 0 && bucket.distanceMeters > 0
              ? Math.max(4, (bucket.distanceMeters / max) * CHART_HEIGHT)
              : EMPTY_BAR_HEIGHT;
          return (
            <View
              key={bucket.start.getTime()}
              accessible
              accessibilityLabel={translate('rideReviewChartBarLabel', {
                label: bucketAccessibilityLabel(period, bucket, index),
                distance: formatDistanceKm(bucket.distanceMeters),
              })}
              style={[
                styles.chartBar,
                {
                  height,
                  backgroundColor:
                    bucket.distanceMeters > 0 ? ACCENT_COLOR : colors.border,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.chartLabels}>
        {buckets.map((bucket, index) => (
          <Typography
            key={bucket.start.getTime()}
            numberOfLines={2}
            style={[styles.chartLabel, { color: colors.secondaryText }]}
          >
            {bucketLabel(period, bucket, index, buckets.length)}
          </Typography>
        ))}
      </View>
    </Card>
  );
};

const RouteMapCard = ({
  period,
  stats,
  routes,
}: {
  period: RidePeriod;
  stats: RideStats;
  routes: RideRoutes;
}) => {
  const colors = useAppColors();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const navigation = useNavigation();
  const mapBackgroundColor = useRideRouteMapBackgroundColor();
  const hasRoutes = routes.lines.length > 0;

  const handleExpand = useCallback(() => {
    navigation.dispatch(
      CommonActions.navigate({ name: 'RideRouteMap', params: { period } })
    );
  }, [navigation, period]);

  // 地図は読み上げられないので、描いた路線の名前をまとめて伝える
  const accessibilityLabel = translate('rideReviewRouteMapLabel', {
    lines: stats.lines
      .filter((line) => routes.lineIds.includes(line.lineId))
      .map((line) => line.lineName)
      .filter((name): name is string => name != null)
      .join('、'),
  });

  return (
    <Card>
      <Typography style={styles.cardTitle}>
        {translate('rideReviewRouteMap')}
      </Typography>
      <View
        style={[styles.routeMap, { backgroundColor: mapBackgroundColor }]}
        testID="ride-review-route-map"
      >
        {hasRoutes ? (
          <>
            {/* 画面のスクロールと取り合わないよう、カードの地図は触れても反応させない */}
            <View
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              accessible
              accessibilityRole="image"
              accessibilityLabel={accessibilityLabel}
            >
              <RideRouteMapView routes={routes} variant="card" />
            </View>
            <Pressable
              onPress={handleExpand}
              accessibilityRole="button"
              accessibilityLabel={translate('rideReviewRouteMapExpand')}
              hitSlop={8}
              testID="ride-review-route-map-expand"
              style={[
                styles.routeMapExpand,
                { backgroundColor: isLEDTheme ? '#333' : colors.card },
              ]}
            >
              <Ionicons
                name="expand"
                size={18}
                color={isLEDTheme ? '#fff' : colors.text}
              />
            </Pressable>
          </>
        ) : (
          <View style={styles.routeMapEmpty}>
            <Typography
              style={[
                styles.routeMapEmptyText,
                { color: colors.secondaryText },
              ]}
            >
              {translate('rideReviewRouteMapNone')}
            </Typography>
          </View>
        )}
      </View>
      {hasRoutes && routes.unmappedRideCount > 0 ? (
        <Typography
          style={[
            styles.note,
            { color: colors.secondaryText, fontWeight: 'bold' },
          ]}
        >
          {translate('rideReviewRouteMapUnmapped', {
            count: routes.unmappedRideCount,
          })}
        </Typography>
      ) : null}
      {hasRoutes ? (
        <Typography style={[styles.note, { color: colors.secondaryText }]}>
          {translate('rideReviewRouteMapNote')}
        </Typography>
      ) : null}
    </Card>
  );
};

const TopLines = ({ stats }: { stats: RideStats }) => {
  const colors = useAppColors();
  const lines = stats.lines.slice(0, TOP_LINES_LIMIT);
  const max = lines[0]?.distanceMeters ?? 0;
  if (lines.length === 0) {
    return null;
  }
  return (
    <>
      <Heading>{translate('rideReviewTopLines')}</Heading>
      <Card>
        {lines.map((line) => {
          const color = line.lineColor ?? colors.secondaryText;
          return (
            <View key={line.lineId} style={styles.lineRow}>
              <View style={[styles.lineColor, { backgroundColor: color }]} />
              <View style={styles.lineBody}>
                <View style={styles.lineHeader}>
                  <Typography numberOfLines={1} style={styles.lineName}>
                    {line.lineName ?? ''}
                  </Typography>
                  <Typography
                    style={[styles.lineValue, { color: colors.secondaryText }]}
                  >
                    {translate('rideReviewLineValue', {
                      distance: formatDistanceKm(line.distanceMeters),
                      count: line.rideCount,
                    })}
                  </Typography>
                </View>
                <View
                  style={[styles.lineTrack, { backgroundColor: colors.border }]}
                >
                  <View
                    style={[
                      styles.lineFill,
                      {
                        width: `${max > 0 ? (line.distanceMeters / max) * 100 : 0}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </Card>
    </>
  );
};

const Intro = () => {
  const colors = useAppColors();
  const setRideLogEnabled = useSetAtom(rideLogEnabledAtom);

  // 設定画面(RideLogSettings)のトグルと同じ値を切り替える
  const handleEnable = useCallback(() => {
    setRideLogEnabled(true);
    try {
      storage.set(STORAGE_KEYS.RIDE_LOG_ENABLED, 'true');
    } catch (error) {
      setRideLogEnabled(false);
      console.error('Failed to save ride log setting', error);
      showDialog(translate('errorTitle'), translate('failedToSavePreference'));
    }
  }, [setRideLogEnabled]);

  const points = [
    'rideReviewIntroPointStations',
    'rideReviewIntroPointLocal',
    'rideReviewIntroPointPast',
  ];

  return (
    <>
      <Card>
        <Typography style={styles.cardTitle}>
          {translate('rideReviewIntroTitle')}
        </Typography>
        <Typography style={styles.bodyText}>
          {translate('rideReviewIntroBody')}
        </Typography>
        {points.map((key) => (
          <View key={key} style={styles.point}>
            <Typography
              style={[styles.pointBullet, { color: colors.secondaryText }]}
            >
              ・
            </Typography>
            <Typography
              style={[styles.pointText, { color: colors.secondaryText }]}
            >
              {translate(key)}
            </Typography>
          </View>
        ))}
      </Card>
      <Button
        style={styles.enableButton}
        textStyle={{ fontWeight: 'bold' }}
        onPress={handleEnable}
      >
        {translate('rideReviewEnable')}
      </Button>
      <Typography style={[styles.note, { color: colors.secondaryText }]}>
        {translate('rideReviewIntroNote')}
      </Typography>
    </>
  );
};

const Empty = () => {
  const colors = useAppColors();
  return (
    <Card>
      <Typography style={styles.cardTitle}>
        {translate('rideReviewEmptyTitle')}
      </Typography>
      <Typography style={[styles.bodyText, { color: colors.secondaryText }]}>
        {translate('rideReviewEmptyBody')}
      </Typography>
    </Card>
  );
};

const Report = ({
  walkthroughRefs,
  onWalkthroughReadyChange,
}: {
  walkthroughRefs: WalkthroughTargetRefs;
  // 案内するカードがすべて表示されたか。ウォークスルーを始めてよいかに使う
  onWalkthroughReadyChange: (ready: boolean) => void;
}) => {
  const colors = useAppColors();
  const [period, setPeriod] = useState<RidePeriod>('month');
  const state = useRideStats(period, true);
  const walkthroughReady =
    state.status === 'ready' &&
    state.period === period &&
    state.stats.rideCount > 0 &&
    state.stats.lines.length > 0;

  useEffect(() => {
    onWalkthroughReadyChange(walkthroughReady);
  }, [onWalkthroughReadyChange, walkthroughReady]);

  return (
    <>
      <View ref={walkthroughRefs.rideReviewPeriod} collapsable={false}>
        <PeriodSegment value={period} onChange={setPeriod} />
      </View>
      {state.status === 'error' ? (
        <Typography style={[styles.bodyText, { color: colors.secondaryText }]}>
          {translate('rideReviewLoadFailed')}
        </Typography>
      ) : null}
      {/* 初回の読み込み中と、期間を切り替えた直後(前の期間の結果しか無い間)は
          読み込み中の表示を出す */}
      {state.status === 'loading' ||
      (state.status === 'ready' && state.period !== period) ? (
        <ActivityIndicator
          style={styles.loading}
          color={colors.secondaryText}
          accessibilityLabel={translate('rideReviewLoading')}
          testID="ride-review-loading"
        />
      ) : null}
      {state.status === 'ready' && state.period === period ? (
        <>
          <Typography
            style={[styles.rangeText, { color: colors.secondaryText }]}
          >
            {formatRange(period, state.range)}
          </Typography>
          <View ref={walkthroughRefs.rideReviewSummary} collapsable={false}>
            <SummaryCard stats={state.stats} />
          </View>
          {state.stats.rideCount === 0 ? (
            <Empty />
          ) : (
            <>
              <DistanceChart period={period} buckets={state.stats.buckets} />
              <View
                ref={walkthroughRefs.rideReviewRouteMap}
                collapsable={false}
              >
                <RouteMapCard
                  period={period}
                  stats={state.stats}
                  routes={state.routes}
                />
              </View>
              <View
                ref={walkthroughRefs.rideReviewTopLines}
                collapsable={false}
                style={styles.walkthroughGroup}
              >
                <TopLines stats={state.stats} />
              </View>
              <Typography
                style={[styles.note, { color: colors.secondaryText }]}
              >
                {translate('rideReviewNote')}
              </Typography>
            </>
          )}
        </>
      ) : null}
    </>
  );
};

const RideReviewScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const scrollY = useRef(new RNAnimated.Value(0)).current;
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const footerHeight = useFooterHeight();
  const rideLogEnabled = useAtomValue(rideLogEnabledAtom);
  const { height: windowHeight } = useWindowDimensions();

  const handleScroll = useRef(
    RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    })
  ).current;

  // --- ウォークスルー(#7117) ---
  const scrollRef = useRef<ScrollView>(null);
  // スクロール位置。ネイティブで動く scrollY を JS 側でも読めるよう購読する
  const scrollOffsetRef = useRef(0);
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      scrollOffsetRef.current = value;
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const periodRef = useRef<View>(null);
  const summaryRef = useRef<View>(null);
  const routeMapRef = useRef<View>(null);
  const topLinesRef = useRef<View>(null);
  const walkthroughRefs = useRef<WalkthroughTargetRefs>({
    rideReviewPeriod: periodRef,
    rideReviewSummary: summaryRef,
    rideReviewRouteMap: routeMapRef,
    rideReviewTopLines: topLinesRef,
  }).current;

  const [walkthroughReady, setWalkthroughReady] = useState(false);
  const {
    isWalkthroughActive,
    currentStepIndex,
    currentStepId,
    currentStep,
    totalSteps,
    nextStep,
    goToStep,
    skipWalkthrough,
    setSpotlightArea,
  } = useRideReviewWalkthrough(rideLogEnabled && walkthroughReady);
  const [tooltipPosition, setTooltipPosition] =
    useState<WalkthroughStep['tooltipPosition']>('bottom');

  // ステップが変わったら、対象のカードを見出しのすぐ下までスクロールしてから切り抜く
  useEffect(() => {
    if (!isWalkthroughActive || !currentStepId || !headerHeight) {
      return;
    }
    const target =
      walkthroughRefs[currentStepId as keyof WalkthroughTargetRefs]?.current;
    if (!target) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    target.measureInWindow((_x, y) => {
      if (cancelled) {
        return;
      }
      const nextOffset = Math.max(
        0,
        scrollOffsetRef.current + y - (headerHeight + WALKTHROUGH_TARGET_MARGIN)
      );
      scrollRef.current?.scrollTo({ y: nextOffset, animated: true });
      timer = setTimeout(() => {
        target.measureInWindow((x, measuredY, width, height) => {
          if (cancelled) {
            return;
          }
          // 画面の終わり近くのカードは見出しの下までスクロールできないので、
          // 下に吹き出しが収まらなければ上に出す
          setTooltipPosition(
            measuredY + height + WALKTHROUGH_TOOLTIP_SPACE >
              windowHeight - footerHeight
              ? 'top'
              : 'bottom'
          );
          setSpotlightArea({
            x,
            y: measuredY,
            width,
            height,
            borderRadius:
              WALKTHROUGH_RADIUS[currentStepId] ?? WALKTHROUGH_CARD_RADIUS,
          });
        });
      }, WALKTHROUGH_SCROLL_SETTLE_MS);
    });
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    currentStepId,
    footerHeight,
    headerHeight,
    isWalkthroughActive,
    setSpotlightArea,
    walkthroughRefs,
    windowHeight,
  ]);

  // 案内を終えたら画面の先頭に戻す
  const wasWalkthroughActiveRef = useRef(false);
  useEffect(() => {
    if (wasWalkthroughActiveRef.current && !isWalkthroughActive) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
    wasWalkthroughActiveRef.current = isWalkthroughActive;
  }, [isWalkthroughActive]);

  return (
    <>
      <SafeAreaView
        style={[
          styles.root,
          !isLEDTheme && { backgroundColor: colors.background },
        ]}
      >
        <RNAnimated.ScrollView
          ref={scrollRef}
          style={StyleSheet.absoluteFill}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.content,
            headerHeight ? { paddingTop: headerHeight } : null,
            { paddingBottom: footerHeight + 24 },
          ]}
        >
          {rideLogEnabled ? (
            <Report
              walkthroughRefs={walkthroughRefs}
              onWalkthroughReadyChange={setWalkthroughReady}
            />
          ) : (
            <Intro />
          )}
        </RNAnimated.ScrollView>
      </SafeAreaView>
      <SettingsHeader
        title={translate('rideReview')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        scrollY={scrollY}
      />
      <FooterTabBar active="review" />
      {/* 切り抜きの位置を測れてから出す(測る前に出すと、暗幕だけが画面を覆う) */}
      {currentStep?.spotlightArea ? (
        <WalkthroughOverlay
          visible={isWalkthroughActive}
          step={{ ...currentStep, tooltipPosition }}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onNext={nextStep}
          onGoToStep={goToStep}
          onSkip={skipWalkthrough}
        />
      ) : null}
    </>
  );
};

export default React.memo(RideReviewScreen);
