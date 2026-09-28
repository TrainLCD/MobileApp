import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { getRideSessionsStartedBetween } from '~/lib/rideLog';
import {
  getRidePeriodRange,
  type RidePeriod,
  type RidePeriodRange,
  type RideStats,
  summarizeRides,
} from '~/utils/rideStats';

type RideStatsState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      period: RidePeriod;
      range: RidePeriodRange;
      stats: RideStats;
    };

/**
 * 振り返り画面の集計を読み込む。画面が表示されるたびと期間を切り替えたときに、
 * その時点の期間(今週・今月・今年)で読み直す。乗車中は Main 画面が前面にあり
 * この画面は表示されないので、表示中に記録が増えることは考えない。
 */
export const useRideStats = (
  period: RidePeriod,
  enabled: boolean
): RideStatsState => {
  const [state, setState] = useState<RideStatsState>({ status: 'loading' });

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }
      let cancelled = false;
      const range = getRidePeriodRange(period, new Date());
      getRideSessionsStartedBetween(range.start.getTime(), range.end.getTime())
        .then((sessions) => {
          if (cancelled) {
            return;
          }
          setState({
            status: 'ready',
            period,
            range,
            stats: summarizeRides(sessions, period, range),
          });
        })
        .catch((error) => {
          console.error('Failed to load ride stats', error);
          if (!cancelled) {
            setState({ status: 'error' });
          }
        });
      return () => {
        cancelled = true;
      };
    }, [enabled, period])
  );

  return state;
};
