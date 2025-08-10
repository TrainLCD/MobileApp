import dayjs from 'dayjs';
import memoize from 'lodash/memoize';
import { JAPANESE_NATIONAL_HOLIDAYS } from '~/constants';

const formatDate = (date: Date) => [
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
];

export const getIsHoliday = memoize((date: Date): boolean => {
  const now = dayjs(date);

  const isNationalHoliday = JAPANESE_NATIONAL_HOLIDAYS.some((ev) => {
    const eventDay = dayjs(ev.date);
    return now.isSame(eventDay, 'month') && now.isSame(eventDay, 'date');
  });
  const isWeekend = now.day() === 0 || now.day() === 6;

  return isWeekend || isNationalHoliday;
}, formatDate);
