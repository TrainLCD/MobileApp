import { createStore } from 'jotai';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';

const readAfterReload = () => {
  let enabled: boolean | undefined;
  jest.isolateModules(() => {
    const { createStore: createFreshStore } = require('jotai');
    const {
      iosBackgroundDistanceFilterBypassAtom,
    } = require('./locationSettings');
    enabled = createFreshStore().get(iosBackgroundDistanceFilterBypassAtom);
  });
  return enabled;
};

// 同期ストレージはモジュール再ロードの前後で同じ端末データを参照する。
jest.mock('~/lib/storage', () => {
  const values = new Map<string, string>();
  return {
    storage: {
      getString: (key: string) => values.get(key),
      set: (key: string, value: string) => values.set(key, value),
      remove: (key: string) => values.delete(key),
      clearAll: () => values.clear(),
    },
  };
});

beforeEach(() =>
  storage.remove(STORAGE_KEYS.IOS_BACKGROUND_DISTANCE_FILTER_BYPASS)
);

it.each([undefined, 'true', 'invalid'])(
  '未設定・ON・不正値(%s)では既存の解除動作を維持する',
  (value) => {
    if (value !== undefined)
      storage.set(STORAGE_KEYS.IOS_BACKGROUND_DISTANCE_FILTER_BYPASS, value);
    expect(readAfterReload()).toBe(true);
  }
);

it('保存したOFFをモジュール再ロード後も復元する', () => {
  const {
    iosBackgroundDistanceFilterBypassAtom,
  } = require('./locationSettings');
  createStore().set(iosBackgroundDistanceFilterBypassAtom, false);
  expect(readAfterReload()).toBe(false);
});
