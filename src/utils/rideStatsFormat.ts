import { translate } from '~/translation';
import type { RidePeriod, RidePeriodRange } from '~/utils/rideStats';

// 振り返り機能の表示用の整形。振り返りタブとホームのカードで同じ書式にそろえる

export const formatDistanceKm = (meters: number): string =>
  (meters / 1000).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

export const formatDuration = (ms: number): string => {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? translate('rideReviewDurationHoursMinutes', { hours, minutes })
    : translate('rideReviewDurationMinutes', { minutes });
};

export const formatMonthDay = (date: Date): string =>
  `${date.getMonth() + 1}/${date.getDate()}`;

export const formatRange = (
  period: RidePeriod,
  range: RidePeriodRange
): string => {
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
