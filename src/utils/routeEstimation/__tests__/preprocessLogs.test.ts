import {
  appendToBuffer,
  BUFFER_MAX_AGE_MS,
  getAvgSpeed,
  getMedianSpeed,
  getTotalDistance,
  isMoving,
  isTransferStop,
  preprocessLogs,
} from '../preprocessLogs';
import type { FilteredLocationLog, LocationLog } from '../types';

const mkLog = (
  lat: number,
  lng: number,
  timestamp: number,
  accuracy: number | null = 30
): LocationLog => ({
  latitude: lat,
  longitude: lng,
  accuracy,
  timestamp,
  speed: null,
});

describe('appendToBuffer', () => {
  it('正常なポイントをバッファに追加する', () => {
    const buffer: LocationLog[] = [];
    const point = mkLog(35.68, 139.76, 1000);
    const result = appendToBuffer(buffer, point);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(point);
  });

  it('低精度ポイントを棄却する', () => {
    const buffer: LocationLog[] = [];
    const point = mkLog(35.68, 139.76, 1000, 5000);
    const result = appendToBuffer(buffer, point);
    expect(result).toHaveLength(0);
  });

  it('速度ジャンプを棄却する', () => {
    const prev = mkLog(35.68, 139.76, 1000);
    const buffer = [prev];
    // 1秒後に非常に遠い地点（速度 >> 100 m/s）
    const farPoint = mkLog(36.0, 140.0, 2000);
    const result = appendToBuffer(buffer, farPoint);
    expect(result).toHaveLength(1); // 新しいポイントは追加されない
  });

  it('古いポイントを除去する', () => {
    const old = mkLog(35.68, 139.76, 1000);
    const newer = mkLog(35.681, 139.761, BUFFER_MAX_AGE_MS + 2000);
    const buffer = [old];
    const result = appendToBuffer(buffer, newer);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(newer);
  });
});

describe('preprocessLogs', () => {
  it('2点未満では空配列を返す', () => {
    expect(preprocessLogs([])).toEqual([]);
    expect(preprocessLogs([mkLog(35.68, 139.76, 1000)])).toEqual([]);
  });

  it('各ポイントにdistFromPrevとdtFromPrevを付与する', () => {
    const logs = [mkLog(35.68, 139.76, 0), mkLog(35.681, 139.761, 3000)];
    const result = preprocessLogs(logs);
    expect(result).toHaveLength(2);
    expect(result[0].distFromPrev).toBe(0);
    expect(result[0].dtFromPrev).toBe(0);
    expect(result[1].distFromPrev).toBeGreaterThan(0);
    expect(result[1].dtFromPrev).toBe(3);
  });
});

describe('getTotalDistance', () => {
  it('移動距離の合計を返す', () => {
    const logs: FilteredLocationLog[] = [
      { ...mkLog(0, 0, 0), distFromPrev: 0, dtFromPrev: 0 },
      { ...mkLog(0, 0, 1000), distFromPrev: 100, dtFromPrev: 1 },
      { ...mkLog(0, 0, 2000), distFromPrev: 150, dtFromPrev: 1 },
    ];
    expect(getTotalDistance(logs)).toBe(250);
  });
});

describe('getAvgSpeed', () => {
  it('平均速度を返す', () => {
    const logs: FilteredLocationLog[] = [
      { ...mkLog(0, 0, 0), distFromPrev: 0, dtFromPrev: 0 },
      { ...mkLog(0, 0, 5000), distFromPrev: 50, dtFromPrev: 5 },
    ];
    expect(getAvgSpeed(logs)).toBe(10); // 50m / 5s
  });
});

describe('getMedianSpeed', () => {
  it('速度中央値を返す', () => {
    const logs: FilteredLocationLog[] = [
      { ...mkLog(0, 0, 0), distFromPrev: 0, dtFromPrev: 0 },
      { ...mkLog(0, 0, 1000), distFromPrev: 10, dtFromPrev: 1 },
      { ...mkLog(0, 0, 2000), distFromPrev: 20, dtFromPrev: 1 },
      { ...mkLog(0, 0, 3000), distFromPrev: 30, dtFromPrev: 1 },
    ];
    expect(getMedianSpeed(logs)).toBe(20); // 中央値
  });
});

describe('isMoving', () => {
  it('十分な移動距離と速度で true を返す', () => {
    const logs: FilteredLocationLog[] = [
      { ...mkLog(0, 0, 0), distFromPrev: 0, dtFromPrev: 0 },
      { ...mkLog(0, 0, 10_000), distFromPrev: 250, dtFromPrev: 10 },
    ];
    expect(isMoving(logs)).toBe(true);
  });

  it('移動距離が不足なら false を返す', () => {
    const logs: FilteredLocationLog[] = [
      { ...mkLog(0, 0, 0), distFromPrev: 0, dtFromPrev: 0 },
      { ...mkLog(0, 0, 10_000), distFromPrev: 100, dtFromPrev: 10 },
    ];
    expect(isMoving(logs)).toBe(false);
  });
});

describe('isTransferStop', () => {
  it('長時間停車で true を返す', () => {
    const logs: FilteredLocationLog[] = [];
    for (let i = 0; i <= 15; i++) {
      logs.push({
        ...mkLog(35.68, 139.76, i * 1000),
        distFromPrev: 0,
        dtFromPrev: i === 0 ? 0 : 1,
      });
    }
    expect(isTransferStop(logs)).toBe(true);
  });

  it('移動中なら false を返す', () => {
    const logs: FilteredLocationLog[] = [
      { ...mkLog(0, 0, 0), distFromPrev: 0, dtFromPrev: 0 },
      { ...mkLog(0, 0, 3000), distFromPrev: 100, dtFromPrev: 3 },
    ];
    expect(isTransferStop(logs)).toBe(false);
  });
});
