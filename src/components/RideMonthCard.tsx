import { Ionicons } from '@expo/vector-icons';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { useCallback } from 'react';
import {
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { CardChevron } from '~/components/CardChevron';
import Typography from '~/components/Typography';
import { useRideStats } from '~/hooks/useRideStats';
import { useAppColors } from '~/providers/AppColorsProvider';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { formatDistanceKm, formatDuration } from '~/utils/rideStatsFormat';

const styles = StyleSheet.create({
  root: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  bg: {
    borderRadius: 8,
    // CommonCard と同じ影値
    boxShadow: '0px 0px 8px rgba(51, 51, 51, 0.25)',
  },
  ledBg: {
    backgroundColor: '#212121',
    borderColor: '#fff',
    borderWidth: 1,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

type Props = {
  style?: StyleProp<ViewStyle>;
};

/**
 * ホームに出す今月の振り返り(#7100)。振り返りを有効にしたユーザーにだけ
 * マウントする(呼び出し側で rideLogEnabledAtom を見て出し分ける)。
 * 記録が0件でも出して、記録が動いていることを伝える。
 */
export const RideMonthCard: React.FC<Props> = ({ style }: Props) => {
  const navigation = useNavigation();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const state = useRideStats('month', true);

  // フッターのタブと同じく、履歴を積まないよう replace で振り返りタブへ移る
  const handlePress = useCallback(() => {
    navigation.dispatch(StackActions.replace('RideReview'));
  }, [navigation]);

  let value = '—';
  if (state.status === 'ready' && state.period === 'month') {
    value =
      state.stats.rideCount === 0
        ? translate('rideMonthCardEmpty')
        : translate('rideMonthCardValue', {
            distance: formatDistanceKm(state.stats.distanceMeters),
            duration: formatDuration(state.stats.durationMs),
          });
  }

  return (
    <TouchableOpacity
      testID="ride-month-card"
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${translate('rideMonthCardTitle')} ${value}`}
      onPress={handlePress}
      style={[
        styles.root,
        isLEDTheme
          ? styles.ledBg
          : [styles.bg, { backgroundColor: colors.card }],
        style,
      ]}
    >
      <Ionicons name="stats-chart" size={22} color={colors.accent} />
      <View style={styles.texts}>
        <Typography style={[styles.title, { color: colors.secondaryText }]}>
          {translate('rideMonthCardTitle')}
        </Typography>
        <Typography
          style={styles.value}
          numberOfLines={1}
          testID="ride-month-card-value"
        >
          {value}
        </Typography>
      </View>
      {/* 既定の stroke(#fff) は白背景で不可視になるため、テーマに応じて指定する */}
      <CardChevron stroke={isLEDTheme || colors.isDark ? '#fff' : '#000'} />
    </TouchableOpacity>
  );
};
