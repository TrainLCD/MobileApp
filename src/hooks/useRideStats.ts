import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { getRideSessionsStartedBetween } from '~/lib/rideLog';
import { buildRideRoutes, type RideRoutes } from '~/utils/rideRoutes';
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
      // 移動経路の地図に描く線
      routes: RideRoutes;
    };

// setTimeout に渡せる最大の待ち時間(約24.8日)。年の終わりまではこれより長いので、
// 超える場合はここで一度起きて、終わりまでの残りを測り直す
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * 振り返り画面とホームのカードの集計を読み込む。
 *
 * 次のときに、その時点の期間(今週・今月・今年)で範囲を計算し直して読み直す。
 * - 画面が表示されたとき・期間を切り替えたとき
 * - 表示中に期間の終わり(週・月・年の変わり目)を迎えたとき
 * - アプリが前面に戻ったとき(裏にいるあいだに期間が変わっていることがある)
 * 乗車中は Main 画面が前面にあり、この画面は表示されないので、表示中に記録が
 * 増えることは考えない。
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
      // 古い読み込みの結果で新しい結果を上書きしないよう、最後に始めたものだけを使う
      let latestLoad = 0;
      let boundaryTimer: ReturnType<typeof setTimeout> | null = null;

      const scheduleBoundary = (range: RidePeriodRange) => {
        if (boundaryTimer) {
          clearTimeout(boundaryTimer);
        }
        const delay = range.end.getTime() - Date.now();
        boundaryTimer = setTimeout(
          () => {
            boundaryTimer = null;
            if (Date.now() >= range.end.getTime()) {
              load();
            } else {
              scheduleBoundary(range);
            }
          },
          Math.min(Math.max(delay, 0), MAX_TIMEOUT_MS)
        );
      };

      const load = () => {
        latestLoad += 1;
        const loadId = latestLoad;
        const range = getRidePeriodRange(period, new Date());
        scheduleBoundary(range);
        getRideSessionsStartedBetween(
          range.start.getTime(),
          range.end.getTime()
        )
          .then((sessions) => {
            if (cancelled || loadId !== latestLoad) {
              return;
            }
            setState({
              status: 'ready',
              period,
              range,
              stats: summarizeRides(sessions, period, range),
              routes: buildRideRoutes(sessions, range),
            });
          })
          .catch((error) => {
            console.error('Failed to load ride stats', error);
            if (!cancelled && loadId === latestLoad) {
              setState({ status: 'error' });
            }
          });
      };

      load();
      const subscription = AppState.addEventListener('change', (next) => {
        if (next === 'active') {
          load();
        }
      });

      return () => {
        cancelled = true;
        subscription.remove();
        if (boundaryTimer) {
          clearTimeout(boundaryTimer);
        }
      };
    }, [enabled, period])
  );

  return state;
};
