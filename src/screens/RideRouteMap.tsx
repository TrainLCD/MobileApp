import { Ionicons } from '@expo/vector-icons';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useAtomValue } from 'jotai';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RideRouteMapView,
  useRideRouteMapBackgroundColor,
} from '~/components/RideRouteMapView';
import Typography from '~/components/Typography';
import { useRideStats } from '~/hooks/useRideStats';
import { useAppColors } from '~/providers/AppColorsProvider';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import type { RidePeriod } from '~/utils/rideStats';
import { formatDistanceKm, formatRange } from '~/utils/rideStatsFormat';

type RideRouteMapParams = { RideRouteMap: { period?: RidePeriod } };

const LEGEND_SWATCH_HEIGHT = 6;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  titleText: { fontSize: 15, fontWeight: 'bold' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '40%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetContent: { paddingHorizontal: 24, paddingTop: 16, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendSwatch: {
    width: 24,
    height: LEGEND_SWATCH_HEIGHT,
    borderRadius: LEGEND_SWATCH_HEIGHT / 2,
  },
  legendName: { flex: 1, fontSize: 14, fontWeight: 'bold' },
  legendValue: { fontSize: 12, fontWeight: 'bold' },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  message: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 21,
    textAlign: 'center',
  },
});

/**
 * 振り返りの移動経路を全画面で表示する。振り返り画面の地図カードから開き、
 * カードと同じ期間(今週・今月・今年)の乗車を、ピンチとドラッグで動かせる地図に描く。
 */
const RideRouteMapScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RideRouteMapParams, 'RideRouteMap'>>();
  const period = route.params?.period ?? 'month';
  const state = useRideStats(period, true);
  const colors = useAppColors();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const insets = useSafeAreaInsets();
  const mapBackgroundColor = useRideRouteMapBackgroundColor();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);

  const surfaceColor = isLEDTheme ? '#333' : colors.card;

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  const handleHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    setHeaderHeight(e.nativeEvent.layout.height);
  }, []);
  const handleSheetLayout = useCallback((e: LayoutChangeEvent) => {
    setSheetHeight(e.nativeEvent.layout.height);
  }, []);

  const ready = state.status === 'ready' && state.period === period;
  const hasRoutes = ready && state.routes.lines.length > 0;
  // 凡例は地図に描いた路線だけにする(駅の座標を保存する前の乗車の路線は描いていない)
  const legendLines = hasRoutes
    ? state.stats.lines.filter((line) =>
        state.routes.lineIds.includes(line.lineId)
      )
    : [];
  const hasLegend = legendLines.length > 0;
  const headerTop = insets.top + 12;

  return (
    <View style={[styles.root, { backgroundColor: mapBackgroundColor }]}>
      {hasRoutes ? (
        <RideRouteMapView
          routes={state.routes}
          variant="fullscreen"
          // 見出しと凡例に隠れない範囲に経路を収め、地図の出典表記も凡例の上に出す
          mapPadding={{
            top: headerTop + headerHeight,
            right: 0,
            bottom: hasLegend ? sheetHeight : insets.bottom,
            left: 0,
          }}
        />
      ) : null}

      {state.status === 'loading' ||
      (state.status === 'ready' && state.period !== period) ? (
        <View style={styles.center}>
          <ActivityIndicator
            color={colors.secondaryText}
            accessibilityLabel={translate('rideReviewLoading')}
          />
        </View>
      ) : null}
      {state.status === 'error' || (ready && !hasRoutes) ? (
        <View style={styles.center}>
          <Typography style={[styles.message, { color: colors.secondaryText }]}>
            {state.status === 'error'
              ? translate('rideReviewLoadFailed')
              : translate('rideReviewRouteMapNone')}
          </Typography>
        </View>
      ) : null}

      <View
        style={[styles.header, { top: headerTop }]}
        onLayout={handleHeaderLayout}
      >
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={translate('close')}
          hitSlop={8}
          style={[
            styles.close,
            styles.floating,
            { backgroundColor: surfaceColor },
          ]}
        >
          <Ionicons
            name="close"
            size={22}
            color={isLEDTheme ? '#fff' : colors.text}
          />
        </Pressable>
        {ready ? (
          <View
            style={[
              styles.title,
              styles.floating,
              { backgroundColor: surfaceColor },
            ]}
          >
            <Typography
              numberOfLines={1}
              accessibilityRole="header"
              style={styles.titleText}
            >
              {translate('rideReviewRouteMapTitle', {
                range: formatRange(period, state.range),
              })}
            </Typography>
          </View>
        ) : null}
      </View>

      {hasLegend ? (
        <View
          style={[
            styles.sheet,
            styles.floating,
            { backgroundColor: surfaceColor },
          ]}
          onLayout={handleSheetLayout}
        >
          <ScrollView
            contentContainerStyle={[
              styles.sheetContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
          >
            {legendLines.map((line) => (
              <View key={line.lineId} style={styles.legendRow}>
                <View
                  style={[
                    styles.legendSwatch,
                    {
                      backgroundColor: line.lineColor ?? colors.secondaryText,
                    },
                  ]}
                />
                <Typography numberOfLines={1} style={styles.legendName}>
                  {line.lineName ?? ''}
                </Typography>
                <Typography
                  style={[styles.legendValue, { color: colors.secondaryText }]}
                >
                  {`${formatDistanceKm(line.distanceMeters)} km`}
                </Typography>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

export default React.memo(RideRouteMapScreen);
