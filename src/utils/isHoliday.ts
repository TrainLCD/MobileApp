import dayjs from 'dayjs';
import nationalHolidays from './assets/nationalHolidays.json';

export const getIsHoliday = (): boolean => {
  const now = dayjs();
  const isNationalHoliday = nationalHolidays.some((ev) => {
    const eventDay = dayjs(ev.date);
    return now.isSame(eventDay, 'month') && now.isSame(eventDay, 'date');
  });
  const isWeekend = now.day() === 0 || now.day() === 6;

  return isWeekend || isNationalHoliday;
};
