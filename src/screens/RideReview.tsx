import { useAtomValue, useSetAtom } from 'jotai';
import React, { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  Animated as RNAnimated,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '~/components/Button';
import FooterTabBar, { useFooterHeight } from '~/components/FooterTabBar';
import { Heading } from '~/components/Heading';
import { SettingsHeader } from '~/components/SettingsHeader';
import Typography from '~/components/Typography';
import { STORAGE_KEYS } from '~/constants';
import { useRideStats } from '~/hooks/useRideStats';
import { storage } from '~/lib/storage';
import { useAppColors } from '~/providers/AppColorsProvider';
import { rideLogEnabledAtom } from '~/store/atoms/rideLog';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { showDialog } from '~/utils/dialogPresentation';
import type {
  RidePeriod,
  RidePeriodRange,
  RideStats,
  RideStatsBucket,
} from '~/utils/rideStats';

const ACCENT_COLOR = '#0A84FF';
const CHART_HEIGHT = 96;
const EMPTY_BAR_HEIGHT = 2;
const TOP_LINES_LIMIT = 5;
const PERIODS: RidePeriod[] = ['week', 'month', 'year'];

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
  bodyText: { fontSize: 14, lineHeight: 21 },
  point: { flexDirection: 'row', gap: 8 },
  pointBullet: { fontSize: 12, lineHeight: 18 },
  pointText: { flex: 1, fontSize: 12, lineHeight: 18 },
  enableButton: { alignSelf: 'center', minWidth: 160, marginTop: 8 },
});

const formatDistanceKm = (meters: number): string =>
  (meters / 1000).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const formatDuration = (ms: number): string => {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? translate('rideReviewDurationHoursMinutes', { hours, minutes })
    : translate('rideReviewDurationMinutes', { minutes });
};

const formatMonthDay = (date: Date): string =>
  `${date.getMonth() + 1}/${date.getDate()}`;

const formatRange = (period: RidePeriod, range: RidePeriodRange): string => {
  const { start } = range;
  switch (period) {
    case 'week': {
      // 終わりは半開区間の end の前日(日曜日)
      const lastDay = new Date(
        range.end.getFullYear(),
        range.end.getMonth(),
        range.end.getDate() - 1
      );
      return translate('rideReviewRangeWeek', {
        start: formatMonthDay(start),
        end: formatMonthDay(lastDay),
      });
    }
    case 'month':
      return translate('rideReviewRangeMonth', {
        year: start.getFullYear(),
        month: start.getMonth() + 1,
      });
    case 'year':
      return translate('rideReviewRangeYear', { year: start.getFullYear() });
  }
};

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
        {buckets.map((bucket) => {
          const height =
            max > 0 && bucket.distanceMeters > 0
              ? Math.max(4, (bucket.distanceMeters / max) * CHART_HEIGHT)
              : EMPTY_BAR_HEIGHT;
          return (
            <View
              key={bucket.start.getTime()}
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

const Report = () => {
  const colors = useAppColors();
  const [period, setPeriod] = useState<RidePeriod>('month');
  const state = useRideStats(period, true);

  return (
    <>
      <PeriodSegment value={period} onChange={setPeriod} />
      {state.status === 'error' ? (
        <Typography style={[styles.bodyText, { color: colors.secondaryText }]}>
          {translate('rideReviewLoadFailed')}
        </Typography>
      ) : null}
      {/* 期間を切り替えた直後は前の期間の結果を出さない */}
      {state.status === 'ready' && state.period === period ? (
        <>
          <Typography
            style={[styles.rangeText, { color: colors.secondaryText }]}
          >
            {formatRange(period, state.range)}
          </Typography>
          <SummaryCard stats={state.stats} />
          {state.stats.rideCount === 0 ? (
            <Empty />
          ) : (
            <>
              <DistanceChart period={period} buckets={state.stats.buckets} />
              <TopLines stats={state.stats} />
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

  const handleScroll = useRef(
    RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    })
  ).current;

  return (
    <>
      <SafeAreaView
        style={[
          styles.root,
          !isLEDTheme && { backgroundColor: colors.background },
        ]}
      >
        <RNAnimated.ScrollView
          style={StyleSheet.absoluteFill}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.content,
            headerHeight ? { paddingTop: headerHeight } : null,
            { paddingBottom: footerHeight + 24 },
          ]}
        >
          {rideLogEnabled ? <Report /> : <Intro />}
        </RNAnimated.ScrollView>
      </SafeAreaView>
      <SettingsHeader
        title={translate('rideReview')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        scrollY={scrollY}
      />
      <FooterTabBar active="review" />
    </>
  );
};

export default React.memo(RideReviewScreen);
