import dayjs from 'dayjs';
import memoize from 'lodash/memoize';
import { JAPANESE_NATIONAL_HOLIDAYS } from '~/constants';

const now = dayjs();
const date = now.format('YYYY-MM-DD');

export const getIsHoliday = memoize(
  (): boolean => {
    const isNationalHoliday = JAPANESE_NATIONAL_HOLIDAYS.some((ev) => {
      const eventDay = dayjs(ev.date);
      return now.isSame(eventDay, 'month') && now.isSame(eventDay, 'date');
    });
    const isWeekend = now.day() === 0 || now.day() === 6;

    return isWeekend || isNationalHoliday;
  },
  () => date
);
