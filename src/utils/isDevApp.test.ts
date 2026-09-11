import { getBundleId } from 'react-native-device-info';

jest.mock('react-native-device-info', () => ({
  getBundleId: jest.fn(() => 'me.tinykitten.trainlcd'),
}));

const mockedGetBundleId = jest.mocked(getBundleId);

// isDevApp は import 時に評価される定数のため、bundleId を差し替えてから読み直す。
// __DEV__ は debug ビルド相当で常に true になり bundleId 側の分岐を隠してしまうので、
// リリースビルド相当（false）に落として判定する
const loadIsDevApp = (bundleId: string) => {
  mockedGetBundleId.mockReturnValue(bundleId);
  const globalWithDev = globalThis as unknown as { __DEV__: boolean };
  const originalDev = globalWithDev.__DEV__;
  globalWithDev.__DEV__ = false;
  let isDevApp = false;
  try {
    jest.isolateModules(() => {
      isDevApp = require('./isDevApp').isDevApp;
    });
  } finally {
    globalWithDev.__DEV__ = originalDev;
  }
  return isDevApp;
};

describe('isDevApp', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Canary 版を dev 扱いする', () => {
    expect(loadIsDevApp('me.tinykitten.trainlcd.dev')).toBe(true);
    expect(loadIsDevApp('me.tinykitten.trainlcd.dev.Clip')).toBe(true);
  });

  // local フレーバーは Canary と applicationId を分けただけの検証用ビルドなので、
  // 参照する外部サービスは Canary と揃える。localRelease を焼いても本番へ向かせない
  it('ローカル検証用フレーバーを dev 扱いする', () => {
    expect(loadIsDevApp('me.tinykitten.trainlcd.local')).toBe(true);
  });

  it('本番版は dev 扱いしない', () => {
    expect(loadIsDevApp('me.tinykitten.trainlcd')).toBe(false);
  });
});
