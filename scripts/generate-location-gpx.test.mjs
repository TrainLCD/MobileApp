// generate-location-gpx.mjs の純粋関数に対する回帰テスト。
// Node 標準のテストランナーだけで動く(追加依存なし):
//   node --test scripts/generate-location-gpx.test.mjs
//
// Jest 側は jest-expo プリセットで src/** を対象にしているため、この階層の
// .mjs は拾われない。停車/通過の判定はアプリ本体 (src/utils/isPass.ts) と
// 一致していないと生成物が検証に使えなくなるので、ここで独立して押さえる。

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

import {
  alignTrackDistances,
  applySignalProfile,
  attachTrainRoute,
  buildDeepLinkQuery,
  buildWaypoints,
  cruiseSpeedForDuration,
  cumulativeDistances,
  isPassStopCondition,
  isUndergroundStation,
  planLegTimings,
  pointAtDistance,
  resolveIsHoliday,
  resolveStopIndices,
  stationAtDistance,
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
  // 2026-01-04 は日曜。UTC の 1/4 14:59 は JST の 1/4 23:59 で、まだ日曜のうち。
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
    // JST の 1/2 23:59。週末でも祝日でもないので平日として抜ける。
    assert.equal(
      await resolveIsHoliday(new Date('2026-01-02T14:59:00Z')),
      false
    );
  }
);

test(
  '祝日判定は実行環境のタイムゾーンに依存しない',
  {
    skip: holidayJpAvailable
      ? false
      : '@holiday-jp/holiday_jp が未インストール',
  },
  () => {
    // holiday_jp は Date をローカル時刻で解釈するため、JST の暦日を UTC 側の
    // フィールドに載せた Date をそのまま渡すと TZ=Asia/Tokyo で判定日がずれる。
    // 2026-01-01T10:00:00Z は JST 1/1 19:00 (元日・木) で、ずれると 1/2 を見て
    // false になる。TZ を変えて別プロセスで走らせないと再現しない。
    const moduleUrl = new URL('./generate-location-gpx.mjs', import.meta.url)
      .href;
    const probe = `import(${JSON.stringify(moduleUrl)}).then((m) => m.resolveIsHoliday(new Date('2026-01-01T10:00:00Z'))).then((v) => process.stdout.write(String(v)))`;

    for (const tz of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
      const out = execFileSync(process.execPath, ['-e', probe], {
        env: { ...process.env, TZ: tz },
        encoding: 'utf8',
      });
      assert.equal(out.trim(), 'true', `TZ=${tz} で元日を取りこぼしている`);
    }
  }
);

// --- 電波環境プロファイル -------------------------------------------------
// 地下鉄の検証用GPX (assets/gpx/FLinerSeibu.gpx) の中身を決める部分。
// 落とす点と付ける精度を間違えると、アプリ側の地下鉄分岐を踏まないトラックが
// 静かに出来上がるので、分類規則をここで押さえる。

// 1 秒ごとに 10m ずつ北上する走行点を作る。stopped の点は同じ座標に留まる。
const makeLeg = ({ underground, stoppedSec, runSec, startElapsed = 0 }) => {
  const points = [];
  let elapsed = startElapsed;
  let latitude = 35.0;
  for (let i = 0; i < stoppedSec; i++) {
    points.push({
      latitude,
      longitude: 139.0,
      elapsed,
      stopped: true,
      underground,
    });
    elapsed += 1;
  }
  for (let i = 0; i < runSec; i++) {
    latitude += 10 / 111_132;
    points.push({
      latitude,
      longitude: 139.0,
      elapsed,
      stopped: false,
      underground,
    });
    elapsed += 1;
  }
  return points;
};

test('open では点を落とさず精度も付けない', () => {
  const waypoints = makeLeg({ underground: true, stoppedSec: 3, runSec: 120 });
  const result = applySignalProfile(waypoints, 'open');
  assert.equal(result.length, waypoints.length);
  assert.ok(result.every((wp) => wp.accuracy === undefined));
});

test('subway は地下鉄の駅間だけを落とし、地上の点は全部残す', () => {
  const subway = applySignalProfile(
    makeLeg({ underground: true, stoppedSec: 3, runSec: 120 }),
    'subway'
  );
  const surface = applySignalProfile(
    makeLeg({ underground: false, stoppedSec: 3, runSec: 120 }),
    'subway'
  );

  // 地上は 1 点も落ちない。直通で乗り入れた先が地上路線でも欠測しないこと。
  assert.equal(surface.length, 123);
  // 地下は坑口付近 (portalSec=20) だけが残る。3 点の停車 + 発車後 20 点。
  assert.equal(subway.length, 23);
  // 落ちた点のぶん <time> に穴が開く
  const gaps = subway
    .slice(1)
    .map((wp, i) => wp.elapsed - subway[i].elapsed)
    .filter((gap) => gap > 1);
  assert.equal(gaps.length, 0, '末尾が落ちるだけなので途中に穴はできない');
});

test('subway の精度帯は地上 < ホーム < 坑口の順で、坑口だけが200mを超える', () => {
  const surface = applySignalProfile(
    makeLeg({ underground: false, stoppedSec: 3, runSec: 10 }),
    'subway'
  );
  const underground = applySignalProfile(
    makeLeg({ underground: true, stoppedSec: 3, runSec: 10 }),
    'subway'
  );

  // 地上: GPS が効く帯
  assert.ok(surface.every((wp) => wp.accuracy >= 8 && wp.accuracy <= 20));
  // 地下のホーム: BAD_ACCURACY_THRESHOLD (200m) より良い
  const platform = underground.filter((wp) => wp.stopped);
  assert.ok(platform.every((wp) => wp.accuracy >= 25 && wp.accuracy <= 60));
  // 坑口: 200m を必ず超える。ここが isAccuracyStable を false にする
  const portal = underground.filter((wp) => !wp.stopped);
  assert.ok(portal.length > 0);
  assert.ok(portal.every((wp) => wp.accuracy > 200 && wp.accuracy <= 620));
});

test('subway は止まったままの点に坑口の精度を付けない', () => {
  // 加減速プロファイルの端や、直通の境界駅 (同じ駅が路線ごとに 2 回並ぶ) では
  // stopped が立たないまま座標が動かない点が出る。そこへトンネル内の精度を
  // 付けると「駅に停まったまま基地局測位しか入らない」現実にない点になる。
  const at = (elapsed, stopped) => ({
    latitude: 35.0,
    longitude: 139.0,
    elapsed,
    stopped,
    underground: true,
  });
  const waypoints = [at(0, true), at(1, false), at(2, false)];
  const result = applySignalProfile(waypoints, 'subway');
  assert.equal(result.length, 3);
  assert.ok(
    result.every((wp) => wp.accuracy <= 60),
    '動いていない点はホーム扱いにする'
  );
});

test('subway の出力は決定的', () => {
  const build = () =>
    applySignalProfile(
      makeLeg({ underground: true, stoppedSec: 3, runSec: 60 }),
      'subway'
    );
  assert.deepEqual(build(), build());
});

test('区間の起点駅は境界で切り替わる', () => {
  // 直通では駅ごとに line が異なる。走行中の点がどちらの路線に属するかは
  // 区間の起点駅で決まる。
  const polyline = [
    { latitude: 35.0, longitude: 139.0, line: { lineType: 'Normal' } },
    { latitude: 35.01, longitude: 139.0, line: { lineType: 'Subway' } },
    { latitude: 35.02, longitude: 139.0, line: { lineType: 'Subway' } },
  ];
  const cumulative = cumulativeDistances(polyline);
  const half = cumulative.at(-1) / 2;
  assert.equal(stationAtDistance(polyline, cumulative, 0).line.lineType, 'Normal');
  assert.equal(
    stationAtDistance(polyline, cumulative, half * 0.5).line.lineType,
    'Normal'
  );
  assert.equal(
    stationAtDistance(polyline, cumulative, half * 1.5).line.lineType,
    'Subway'
  );
  assert.equal(
    stationAtDistance(polyline, cumulative, cumulative.at(-1)).line.lineType,
    'Subway'
  );
});

test('地下の判定は lineType と --subway-lines の和になる', () => {
  const subwayLineIds = new Set([99310]);
  // lineType が Subway ならそのまま地下
  assert.equal(
    isUndergroundStation({ line: { id: 28010, lineType: 'Subway' } }, subwayLineIds),
    true
  );
  // 全線地下でも API 上は Normal の路線は、ID を渡して地下へ寄せる
  assert.equal(
    isUndergroundStation({ line: { id: 99310, lineType: 'Normal' } }, subwayLineIds),
    true
  );
  // 指定していない地上路線は地上のまま
  assert.equal(
    isUndergroundStation({ line: { id: 26001, lineType: 'Normal' } }, subwayLineIds),
    false
  );
  // 路線情報が欠けていても落ちない
  assert.equal(isUndergroundStation(undefined, subwayLineIds), false);
  assert.equal(isUndergroundStation({}, subwayLineIds), false);
});

// 停車 -> 走行 -> 停車 の 1 脚。makeLeg と違い走行の後ろにも停車があるので、
// 到着側の坑口窓と、最寄りの停車点を次へ進める処理を通せる。
const makeRoundTrip = ({
  underground,
  stoppedSec,
  runSec,
  leadingUnderground = underground,
}) => {
  const points = [];
  let elapsed = 0;
  let latitude = 35.0;
  const at = (stopped, ug) => {
    points.push({
      latitude,
      longitude: 139.0,
      elapsed,
      stopped,
      underground: ug,
    });
    elapsed += 1;
  };
  for (let i = 0; i < stoppedSec; i++) at(true, leadingUnderground);
  for (let i = 0; i < runSec; i++) {
    latitude += 10 / 111_132;
    at(false, underground);
  }
  for (let i = 0; i < stoppedSec; i++) at(true, underground);
  return points;
};

test('subway は発車側と到着側の両方に坑口窓を残す', () => {
  // 走行 120 秒のうち、両端 20 秒ぶん (portalSec) だけが残り、中央 80 点が落ちる。
  // 到着側が残るには、最寄りの停車点が走行の途中で「次の停車」へ進む必要がある。
  const result = applySignalProfile(
    makeRoundTrip({ underground: true, stoppedSec: 3, runSec: 120 }),
    'subway'
  );

  assert.equal(result.length, 3 + 20 + 20 + 3);

  const gaps = result
    .slice(1)
    .map((wp, i) => wp.elapsed - result[i].elapsed)
    .filter((gap) => gap > 1);
  assert.deepEqual(gaps, [81], '穴は走行の中央に 1 つだけできる');

  // 穴の前後がどちらも坑口帯であること。到着側が落ちると穴が駅到着まで伸び、
  // 復帰点がホーム帯になる。
  const holeAt = result.findIndex(
    (wp, i) => i > 0 && wp.elapsed - result[i - 1].elapsed > 1
  );
  assert.ok(result[holeAt - 1].accuracy > 200, '発車側の末尾が坑口帯');
  assert.ok(result[holeAt].accuracy > 200, '到着側の先頭が坑口帯');
  assert.equal(
    result.filter((wp) => wp.accuracy > 200).length,
    40,
    '坑口帯は両端 20 点ずつ'
  );
  assert.ok(
    result.filter((wp) => wp.stopped).every((wp) => wp.accuracy <= 60),
    '停車点はホーム帯'
  );
});

test('坑口窓は境界駅が地上側でもその駅を起点に測る', () => {
  // 直通の境界駅 (乗り入れ元が地上路線) から地下へ入るケース。停車点は地上帯に
  // なるが、坑口窓の起点としては同じように使われる。
  const result = applySignalProfile(
    makeRoundTrip({
      underground: true,
      leadingUnderground: false,
      stoppedSec: 3,
      runSec: 120,
    }),
    'subway'
  );

  assert.equal(result.length, 3 + 20 + 20 + 3);
  assert.ok(
    result.slice(0, 3).every((wp) => wp.accuracy <= 20),
    '地上側の境界駅は地上帯'
  );
  assert.ok(result[3].accuracy > 200, '発車直後は坑口帯');
});

test('区間の長さは線路の長さがあればそれを使い、無い区間は直線距離で代える', () => {
  const a = { latitude: 35.0, longitude: 139.0 };
  const b = { latitude: 35.01, longitude: 139.0 };
  const straight = cumulativeDistances([a, b]).at(-1);

  // 線路の長さは直線距離より長い
  assert.equal(
    cumulativeDistances([a, { ...b, trackDistanceFromPrevious: 1500 }]).at(-1),
    1500
  );
  // null・0・未定義は直線距離。直通の境界で同じ駅が 2 回並ぶ組は 0 が返る
  for (const track of [null, 0, undefined]) {
    assert.equal(
      cumulativeDistances([a, { ...b, trackDistanceFromPrevious: track }]).at(
        -1
      ),
      straight
    );
  }
});

test('線路の長さで伸ばした区間でも、進んだ割合で直線上の位置へ対応づく', () => {
  const a = { latitude: 35.0, longitude: 139.0 };
  const b = {
    latitude: 35.01,
    longitude: 139.0,
    trackDistanceFromPrevious: 2000,
  };
  const polyline = [a, b];
  const cumulative = cumulativeDistances(polyline);
  const mid = pointAtDistance(polyline, cumulative, 1000);
  assert.ok(Math.abs(mid.latitude - 35.005) < 1e-9);
  // 終端は駅の座標に届く
  assert.deepEqual(pointAtDistance(polyline, cumulative, 2000), {
    latitude: b.latitude,
    longitude: b.longitude,
    trackDistanceFromPrevious: 2000,
  });
});

test('走る向きが API の並びと逆でも、線路の長さは同じ駅の組に付く', () => {
  // API の並び A -> B -> C。B は A から 100m、C は B から 200m
  const api = [
    { id: 1, trackDistanceFromPrevious: null },
    { id: 2, trackDistanceFromPrevious: 100 },
    { id: 3, trackDistanceFromPrevious: 200 },
  ];
  const forward = alignTrackDistances(api, false);
  assert.deepEqual(
    forward.map((s) => s.trackDistanceFromPrevious),
    [null, 100, 200]
  );

  // C -> B -> A で走る。B は C から 200m、A は B から 100m
  const reversed = alignTrackDistances([...api].reverse(), true);
  assert.deepEqual(
    reversed.map((s) => [s.id, s.trackDistanceFromPrevious]),
    [
      [3, null],
      [2, 200],
      [1, 100],
    ]
  );
});

test('区間の起点にした駅は、API の並びで前にあった駅からの長さを持ち越さない', () => {
  // 3 駅目から走り始める。3 駅目の値は 2 駅目からの長さで、走行には使わない
  const sliced = alignTrackDistances(
    [
      { id: 3, trackDistanceFromPrevious: 200 },
      { id: 4, trackDistanceFromPrevious: 300 },
    ],
    false
  );
  assert.equal(sliced[0].trackDistanceFromPrevious, null);
  assert.equal(sliced[1].trackDistanceFromPrevious, 300);
});

// 台形(短い区間は三角形)の所要時間(秒)
const trapezoidSeconds = (distance, v, a, b) => {
  const k = 0.5 / a + 0.5 / b;
  return distance >= v * v * k
    ? distance / v + v * k
    : 2 * Math.sqrt(distance * k);
};

test('巡航速度は、台形で走ったときに求めた時間になる速度', () => {
  for (const [distance, seconds] of [
    [4843, 300],
    [1627, 150],
    [300, 60],
  ]) {
    const { speed, shortened } = cruiseSpeedForDuration(
      distance,
      seconds,
      0.7,
      0.9
    );
    assert.equal(shortened, false);
    assert.ok(
      Math.abs(trapezoidSeconds(distance, speed, 0.7, 0.9) - seconds) < 1e-6
    );
  }
});

test('最短時間より短い時間を求められたら、最短時間で走る速度にする', () => {
  const distance = 2000;
  const k = 0.5 / 0.7 + 0.5 / 0.9;
  const { speed, shortened } = cruiseSpeedForDuration(distance, 10, 0.7, 0.9);
  assert.equal(shortened, true);
  assert.ok(Math.abs(speed - Math.sqrt(distance / k)) < 1e-9);
  // 時間が負や非有限でも最短時間で走る
  assert.equal(cruiseSpeedForDuration(distance, -1, 0.7, 0.9).shortened, true);
  // 距離と加減速が正でなければ決められない
  assert.equal(cruiseSpeedForDuration(0, 60, 0.7, 0.9), null);
  assert.equal(cruiseSpeedForDuration(1000, 60, 0, 0.9), null);
});

const timed = (id, arrivalMin, departureMin) => ({
  id,
  name: `駅${id}`,
  timing: { arrivalSec: arrivalMin * 60, departureSec: departureMin * 60 },
});

test('区間の時間は、次の停車駅の到着とこの駅の出発の差', () => {
  const route = [timed(1, 0, 0), timed(2, 2, 2.6), timed(3, 5, 5)];
  assert.deepEqual(planLegTimings(route, [0, 1, 2]), [
    { runSec: 120, dwellSec: 36 },
    { runSec: 144, dwellSec: 0 },
  ]);
});

test('GPX で通過にした駅に推定だけが停まるときは、その停車時間を走行から引く', () => {
  // 2 駅目は推定では 0.6 分停まるが、GPX では通過 (平日運転の駅を休日に走るなど)
  const route = [timed(1, 0, 0), timed(2, 2, 2.6), timed(3, 5, 5)];
  assert.deepEqual(planLegTimings(route, [0, 2]), [
    { runSec: 264, dwellSec: 0 },
  ]);
});

test('GPX で停まる駅を推定が通過していたら、--dwell が無ければ止める', () => {
  const route = [timed(1, 0, 0), timed(2, 2, 2), timed(3, 5, 5)];
  assert.throws(() => planLegTimings(route, [0, 1, 2]), /--dwell/);
  assert.deepEqual(planLegTimings(route, [0, 1, 2], 30), [
    { runSec: 120, dwellSec: 30 },
    { runSec: 180, dwellSec: 0 },
  ]);
});

test('見込みの無い駅があれば (バスの経路)、見込みでは走らせない', () => {
  const route = [timed(1, 0, 0), { id: 2, name: '駅2', timing: null }];
  assert.equal(planLegTimings(route, [0, 1]), null);
});

test('trainRoute の見込みを駅へ付け、並びが違えば止める', () => {
  const route = [{ id: 1 }, { id: 2 }];
  const segment = (id, arrival, departure) => ({
    station: { id },
    maxSpeed: 25,
    maxAcceleration: 0.7,
    maxDeceleration: 0.9,
    arrivalCumulativeMinutes: arrival,
    departureCumulativeMinutes: departure,
  });
  const attached = attachTrainRoute(route, [
    segment(1, 0, 0),
    segment(2, 1.5, 1.5),
  ]);
  assert.deepEqual(attached[1].timing, { arrivalSec: 90, departureSec: 90 });
  assert.deepEqual(attached[1].motion, {
    maxSpeed: 25,
    accel: 0.7,
    decel: 0.9,
  });
  // Legacy 相当 (見込みが null) なら timing も null
  assert.equal(
    attachTrainRoute(route, [segment(1, null, null), segment(2, null, null)])[1]
      .timing,
    null
  );
  assert.throws(
    () => attachTrainRoute(route, [segment(2, 0, 0), segment(1, 1, 1)]),
    /一致しません/
  );
  assert.throws(
    () => attachTrainRoute(route, [segment(1, 0, 0)]),
    /一致しません/
  );
});

test('見込みで走らせると、停車駅に見込みの時刻どおりに着き、見込みの時間だけ停まる', () => {
  const station = (id, latitude, arrivalMin, departureMin) => ({
    id,
    name: `駅${id}`,
    latitude,
    longitude: 139.0,
    motion: { maxSpeed: 30, accel: 0.7, decel: 0.9 },
    timing: { arrivalSec: arrivalMin * 60, departureSec: departureMin * 60 },
  });
  // 3.3km と 2.2km の区間
  const route = [
    station(1, 35.0, 0, 0),
    station(2, 35.03, 4, 4.6),
    station(3, 35.05, 8, 8),
  ];
  const stopIndices = [0, 1, 2];
  const waypoints = buildWaypoints({
    route,
    stopIndices,
    dwellSec: 60,
    legTimings: planLegTimings(route, stopIndices),
  });
  const firstAt = (s) =>
    waypoints.find((wp) => wp.latitude === s.latitude && wp.elapsed > 0)
      .elapsed;
  // 1 秒刻みなので、着く時刻は見込みから 1 秒以内
  assert.ok(Math.abs(firstAt(route[1]) - 240) <= 1, `${firstAt(route[1])}`);
  assert.ok(Math.abs(firstAt(route[2]) - 480) <= 1, `${firstAt(route[2])}`);
  assert.equal(waypoints.at(-1).elapsed, 480);
  // 2 駅目では 36 秒停まる (到着点の後に 36 点)
  const atSecond = waypoints.filter((wp) => wp.latitude === route[1].latitude);
  assert.ok(atSecond.length >= 37, `${atSecond.length}`);
});
