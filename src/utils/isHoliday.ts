import holiday_jp from '@holiday-jp/holiday_jp';
import dayjs from 'dayjs';
import memoize from 'lodash/memoize';

const formatDate = (date: Date) =>
  [date.getFullYear(), date.getMonth(), date.getDate()].join('-');

export const getIsHoliday = memoize((date: Date): boolean => {
  const now = dayjs(date);

  const isNationalHoliday = holiday_jp.isHoliday(date);
  const isWeekend = now.day() === 0 || now.day() === 6;

  return isWeekend || isNationalHoliday;
}, formatDate);
