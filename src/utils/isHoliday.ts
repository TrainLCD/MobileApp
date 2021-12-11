import dayjs from 'dayjs';

const isHoliday = ((): boolean => dayjs().day() === 0 || dayjs().day() === 6)();

export default isHoliday;
