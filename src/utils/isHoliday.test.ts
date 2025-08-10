import { getIsHoliday } from '~/utils/isHoliday';

jest.useFakeTimers();

describe('Should be weekend', () => {
  it.each([
    // 土曜日 5
    new Date(2024, 0, 6),
    // 日曜日
    new Date(2024, 0, 7),
  ])('%p must be weekend', (date) => {
    jest.setSystemTime(date);
    expect(getIsHoliday(date)).toBeTruthy();
  });
});

describe('Should **not** be weekend', () => {
  it.each([
    // 月曜日
    new Date(2024, 0, 15, 0, 0, 0, 0),
    // 火曜日
    new Date(2024, 0, 16, 0, 0, 0, 0),
  ])('%p must be weekday', (date) => {
    jest.setSystemTime(date);
    expect(getIsHoliday(date)).toBeFalsy();
  });
});

describe('Should be national holiday', () => {
  it.each([
    // 建国記念の日(2024年2月11日 日曜日)
    new Date(2024, 1, 11),
    // 建国記念の日 振替休日(2024年2月12日)
    new Date(2024, 1, 12),
    // 天皇誕生日(2024年2月12日 金曜日)
    new Date(2024, 1, 23),
  ])('%p must be national holiday', (date) => {
    jest.setSystemTime(date);
    expect(getIsHoliday(date)).toBeTruthy();
  });
});
