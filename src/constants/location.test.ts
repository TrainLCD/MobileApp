import * as Location from 'expo-location';

// 停車中に測位が途絶えると到着判定が確定できなくなるため、変位ゲート
// (distanceInterval)の値をプラットフォームごとに固定する回帰テスト。
// 定数はモジュール評価時にPlatform.OSを読むため、分離した registry の中で
// Platform.OS を差し替えてから読み込む。
const loadConstants = (os: 'ios' | 'android') => {
  let constants!: typeof import('./location');
  jest.isolateModules(() => {
    const { Platform } = require('react-native');
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    constants = require('./location');
  });
  return constants;
};

describe('測位オプション', () => {
  describe('Android', () => {
    it('変位ゲートを掛けず更新頻度をtimeIntervalだけで抑える', () => {
      const constants = loadConstants('android');

      // distanceIntervalとtimeIntervalはAND条件のため、変位ゲートが残ると
      // 停車中(=変位ほぼ0)に測位が届かず到着判定が最後の1点に依存してしまう
      expect(constants.LOCATION_DISTANCE_INTERVAL).toBe(0);
      expect(constants.LOCATION_TIME_INTERVAL).toBe(10000);
      expect(constants.LOCATION_WATCH_OPTIONS.distanceInterval).toBe(0);
      expect(constants.LOCATION_TASK_OPTIONS.distanceInterval).toBe(0);
    });
  });

  describe('iOS', () => {
    it('timeIntervalが無視されるため変位ゲートで更新頻度を抑える', () => {
      const constants = loadConstants('ios');

      // 0にするとdistanceFilterが無効化され約1Hzで配信されて電池を著しく消費する。
      // 25mではGPSの揺らぎが閾値を超えず停車中の更新が止まりやすいため10mを使う。
      expect(constants.LOCATION_DISTANCE_INTERVAL).toBe(10);
      expect(constants.LOCATION_WATCH_OPTIONS.distanceInterval).toBe(10);
      expect(constants.LOCATION_TASK_OPTIONS.distanceInterval).toBe(10);
    });
  });

  // 省電力プロファイルは既定プロファイルをspreadしているため、OS分岐の値も
  // そのまま継承する。iOSだけを検証すると変位ゲートのOS分岐の回帰を取りこぼす。
  it.each([
    ['iOS', 'ios', 10],
    ['Android', 'android', 0],
  ] as const)(
    '%s の省電力プロファイルは精度だけを下げ更新間隔は既定値と共通にする',
    (_label, os, expectedDistanceInterval) => {
      const constants = loadConstants(os);

      expect(constants.LOCATION_DISTANCE_INTERVAL).toBe(
        expectedDistanceInterval
      );
      expect(constants.LOCATION_WATCH_OPTIONS_POWER_SAVING).toMatchObject({
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: expectedDistanceInterval,
        timeInterval: constants.LOCATION_TIME_INTERVAL,
      });
      expect(constants.LOCATION_TASK_OPTIONS_POWER_SAVING).toMatchObject({
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: expectedDistanceInterval,
        timeInterval: constants.LOCATION_TIME_INTERVAL,
        pausesUpdatesAutomatically: true,
      });
    }
  );

  it('バックグラウンドのバッチ配信は変位ではなく時間だけで区切る', () => {
    const constants = loadConstants('android');

    // deferredUpdatesDistanceを0にしないと停車中にバッチが flush されない
    expect(constants.LOCATION_TASK_OPTIONS.deferredUpdatesDistance).toBe(0);
    expect(constants.LOCATION_TASK_OPTIONS.deferredUpdatesInterval).toBe(
      constants.LOCATION_TIME_INTERVAL
    );
  });
});
