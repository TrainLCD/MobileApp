import type * as Location from 'expo-location';
import { getDisplacementSpeed, hasMeasuredSpeed } from './displacementSpeed';

const sample = (
  latitude: number,
  longitude: number,
  timestamp: number
): Pick<Location.LocationObject, 'coords' | 'timestamp'> =>
  ({
    coords: { latitude, longitude },
    timestamp,
  }) as Pick<Location.LocationObject, 'coords' | 'timestamp'>;

describe('getDisplacementSpeed', () => {
  it('基準が無い場合はnullを返す', () => {
    expect(getDisplacementSpeed(null, sample(35, 139, 1000))).toBeNull();
    expect(getDisplacementSpeed(undefined, sample(35, 139, 1000))).toBeNull();
  });

  it('現在値が無い場合はnullを返す', () => {
    expect(getDisplacementSpeed(sample(35, 139, 1000), null)).toBeNull();
  });

  it('経過時間が0以下の場合はnullを返す', () => {
    // 同一タイムスタンプの再配信。0除算でInfinityを出さないこと
    expect(
      getDisplacementSpeed(sample(35, 139, 1000), sample(35.001, 139, 1000))
    ).toBeNull();
    expect(
      getDisplacementSpeed(sample(35, 139, 2000), sample(35.001, 139, 1000))
    ).toBeNull();
  });

  it('タイムスタンプが欠けている場合はnullを返す', () => {
    const broken = {
      coords: { latitude: 35, longitude: 139 },
    } as Pick<Location.LocationObject, 'coords' | 'timestamp'>;
    expect(getDisplacementSpeed(broken, sample(35.001, 139, 1000))).toBeNull();
  });

  it('変位と経過時間から速度(m/s)を返す', () => {
    // 緯度1度は約111.32km。0.0009度 ≒ 100m を1秒で進む
    const speed = getDisplacementSpeed(
      sample(35, 139, 1000),
      sample(35.0009, 139, 2000)
    );
    expect(speed).not.toBeNull();
    expect(speed as number).toBeCloseTo(100, 0);
  });

  it('停止している場合は0を返す', () => {
    expect(
      getDisplacementSpeed(sample(35, 139, 1000), sample(35, 139, 2000))
    ).toBe(0);
  });

  it('複数秒空いた場合はその間の平均速度になる', () => {
    const speed = getDisplacementSpeed(
      sample(35, 139, 1000),
      sample(35.0009, 139, 3000)
    );
    expect(speed as number).toBeCloseTo(50, 0);
  });
});

describe('hasMeasuredSpeed', () => {
  it.each([null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    '%p は実測とみなさない',
    (value) => {
      expect(hasMeasuredSpeed(value)).toBe(false);
    }
  );

  it('正の有限値は実測とみなす', () => {
    expect(hasMeasuredSpeed(0.1)).toBe(true);
    expect(hasMeasuredSpeed(88.9)).toBe(true);
  });
});
