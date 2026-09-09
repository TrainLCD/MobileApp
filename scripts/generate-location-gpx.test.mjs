// generate-location-gpx.mjs の純粋関数に対する回帰テスト。
// Node 標準のテストランナーだけで動く(追加依存なし):
//   node --test scripts/generate-location-gpx.test.mjs
//
// Jest 側は jest-expo プリセットで src/** を対象にしているため、この階層の
// .mjs は拾われない。停車/通過の判定はアプリ本体 (src/utils/isPass.ts) と
// 一致していないと生成物が検証に使えなくなるので、ここで独立して押さえる。

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildDeepLinkQuery,
  isPassStopCondition,
  resolveIsHoliday,
  resolveStopIndices,
} from './generate-location-gpx.mjs';

const station = (id, stopCondition) => ({ id, stopCondition });

test('stopCondition の停車/通過判定が isPass.ts と一致する', () => {
  // 停車扱い。Partial(一部通過)・PartialStop(一部停車) も停車に寄せる。
  for (const condition of ['All', 'Partial', 'PartialStop', null, undefined]) {
    assert.equal(isPassStopCondition(condition, false), false);
    assert.equal(isPassStopCondition(condition, true), false);
  }

  // 通過扱い。
  assert.equal(isPassStopCondition('Not', false), true);
  assert.equal(isPassStopCondition('Not', true), true);

  // 平日運転は休日に通過、休日運転は平日に通過。
  assert.equal(isPassStopCondition('Weekday', true), true);
  assert.equal(isPassStopCondition('Weekday', false), false);
  assert.equal(isPassStopCondition('Holiday', false), true);
  assert.equal(isPassStopCondition('Holiday', true), false);
});

test('stopCondition から停車駅の index を導く', () => {
  const route = [
    station(1, 'All'),
    station(2, 'Not'),
    station(3, 'All'),
    station(4, 'PartialStop'),
    station(5, 'All'),
  ];

  assert.deepEqual(
    resolveStopIndices({ route, skippedIds: new Set(), isHoliday: false }),
    [0, 2, 3, 4]
  );
});

test('--skip は stopCondition の判定に上書きではなく追加される', () => {
  const route = [
    station(1, 'All'),
    station(2, 'Not'),
    station(3, 'All'),
    station(4, 'All'),
    station(5, 'All'),
  ];

  // index 1 は stopCondition で、index 3 は --skip で通過になる。
  assert.deepEqual(
    resolveStopIndices({ route, skippedIds: new Set([4]), isHoliday: false }),
    [0, 2, 4]
  );
});

test('始点と終点は通過指定でも必ず停車する', () => {
  // その駅から発車し、その駅で終着するため。ここを通過にすると
  // 速度プロファイルが駅間で閉じず、区間の先頭から加速できない。
  const route = [station(1, 'Not'), station(2, 'All'), station(3, 'Not')];

  assert.deepEqual(
    resolveStopIndices({
      route,
      skippedIds: new Set([1, 3]),
      isHoliday: false,
    }),
    [0, 1, 2]
  );
});

test('休日判定は Weekday / Holiday の駅の扱いを反転させる', () => {
  const route = [
    station(1, 'All'),
    station(2, 'Weekday'),
    station(3, 'Holiday'),
    station(4, 'All'),
  ];

  assert.deepEqual(
    resolveStopIndices({ route, skippedIds: new Set(), isHoliday: false }),
    [0, 1, 3]
  );
  assert.deepEqual(
    resolveStopIndices({ route, skippedIds: new Set(), isHoliday: true }),
    [0, 2, 3]
  );
});

test('ディープリンクのクエリは 0 起点の通過駅 index を出す', () => {
  const route = [station(11), station(22), station(33), station(44)];

  assert.equal(
    buildDeepLinkQuery(route, [0, 2, 3]),
    'sids=11,22,33,44&skips=1'
  );
});

test('通過駅が無ければ skips を付けない', () => {
  const route = [station(11), station(22)];

  assert.equal(buildDeepLinkQuery(route, [0, 1]), 'sids=11,22');
});

test('休日判定は JST の曜日で行う', async () => {
  // 2026-01-03 は土曜。UTC では 1/2 15:00 が JST の 1/3 00:00 にあたる。
  // UTC の曜日で見ると金曜になり、平日と誤判定してしまう。
  assert.equal(await resolveIsHoliday(new Date('2026-01-02T15:00:00Z')), true);
  // その 1 分前は JST でも 1/2 (金) なのでまだ休日ではない。祝日判定へ進む。
  assert.equal(await resolveIsHoliday(new Date('2026-01-04T14:59:00Z')), true);
});

// 祝日判定は @holiday-jp/holiday_jp への遅延 import に依存する。
// npm ci を挟まない CI ジョブでは解決できないため、依存が揃っているときだけ動かす。
const holidayJpAvailable = await import('@holiday-jp/holiday_jp').then(
  () => true,
  () => false
);

test(
  '平日でも祝日は休日として扱う',
  {
    skip: holidayJpAvailable
      ? false
      : '@holiday-jp/holiday_jp が未インストール',
  },
  async () => {
    // 2026-01-01 (木) は元日。
    assert.equal(
      await resolveIsHoliday(new Date('2026-01-01T00:00:00Z')),
      true
    );
    // 2026-01-05 (月) は平日。
    assert.equal(
      await resolveIsHoliday(new Date('2026-01-05T00:00:00Z')),
      false
    );
  }
);
