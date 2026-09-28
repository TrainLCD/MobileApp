import { translate } from '~/translation';

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
