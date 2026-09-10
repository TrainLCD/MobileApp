#!/usr/bin/env node
// GPX を Android のテストプロバイダ経由で流し込む。
// 実機・エミュレータのどちらでも動く (adb shell cmd location providers)。
// 使い方:
//   npm run gpx:replay -- --gpx assets/gpx/SampleTohokuShinkansen.gpx [options]
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const flag = (name) => argv.includes(`--${name}`);

const USAGE = `使い方: npm run gpx:replay -- --gpx <file> [options]

  --gpx <path>        再生する GPX (必須)。<wpt> と <trkpt> のどちらでも読む
  --serial <serial>   adb のデバイスシリアル (省略時は接続中の 1 台)
  --provider <names>  テストプロバイダ名 (カンマ区切り)。既定 gps,network,fused
                      Play 開発者サービスの Fused は gps/network を見るため
                      既定では 3 つすべてに同じ座標を流す
  --speed <n>         再生倍率。既定 1 (GPX の <time> どおり)
  --accuracy <m>      水平精度 (m)。既定 8。カンマ区切りで区間ごとに巡回
  --start <sec>       GPX 先頭からのスキップ秒数。--loop 時は初回のみ適用
  --loop              終端に達したら先頭から繰り返す
  --keep              終了時にテストプロバイダを削除しない`;

if (flag('help') || !opt('gpx')) {
  console.log(USAGE);
  process.exit(opt('gpx') ? 0 : 1);
}

const fail = (message) => {
  console.error(message);
  console.error(`\n${USAGE}`);
  process.exit(1);
};

// --- 引数の検証 -----------------------------------------------------------
// 不正値のまま走ると、非有限の待ち時間で無限に止まったり、undefined を adb へ
// 渡したり、1 点も投入しないまま正常終了したりする。再生を始める前に弾く。
const serial = opt('serial');
const providers = String(opt('provider', 'gps,network,fused'))
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
if (providers.length === 0) {
  fail('--provider にはプロバイダ名を 1 つ以上指定してください。');
}

const speed = Number(opt('speed', '1'));
if (!Number.isFinite(speed) || speed <= 0) {
  fail(`--speed は正の有限数で指定してください: ${opt('speed')}`);
}

const accuracies = String(opt('accuracy', '8'))
  .split(',')
  .map((v) => Number(v.trim()));
if (accuracies.some((v) => !Number.isFinite(v) || v <= 0)) {
  fail(`--accuracy は正の有限数をカンマ区切りで指定してください: ${opt('accuracy')}`);
}

const startSec = Number(opt('start', '0'));
if (!Number.isFinite(startSec) || startSec < 0) {
  fail(`--start は 0 以上の有限数で指定してください: ${opt('start')}`);
}

const adbArgs = (...rest) => (serial ? ['-s', serial, ...rest] : rest);
const adb = async (...rest) => {
  const { stdout, stderr } = await execFileAsync('adb', adbArgs(...rest), {
    maxBuffer: 1 << 22,
  });
  return `${stdout}${stderr}`.trim();
};

// --- GPX 読み込み ---------------------------------------------------------
// <wpt> と <trkpt> の両方を読む。属性の並び順には依存しない。
const gpxPath = opt('gpx');
const xml = readFileSync(gpxPath, 'utf8');
const nodeRe = /<(wpt|trkpt)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1\s*>)/g;
const attr = (attrs, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(attrs);
  if (!m) return null;
  return m[2] ?? m[3];
};

const points = [];
for (let m; (m = nodeRe.exec(xml)); ) {
  const [, tag, attrs, inner = ''] = m;
  const lat = Number(attr(attrs, 'lat'));
  const lon = Number(attr(attrs, 'lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    fail(`<${tag}> の lat/lon を数値として読めません: ${attrs.trim()}`);
  }
  const timeMatch = /<time>([^<]*)<\/time>/.exec(inner);
  points.push({ lat, lon, rawTime: timeMatch ? timeMatch[1].trim() : null });
}
if (points.length === 0) {
  fail(`${gpxPath} に <wpt> / <trkpt> が見つかりません。`);
}

// 再生時刻の組み立て。<time> の有無が混在した GPX は、先頭に <time> が無いだけで
// 後続の offset が Unix epoch ミリ秒になり、事実上停止したように見える。
// 混在と解釈不能な日時はここで弾き、全点無しのときだけ 1Hz とみなす。
const timed = points.filter((p) => p.rawTime !== null);
if (timed.length !== 0 && timed.length !== points.length) {
  fail(
    `${gpxPath} は <time> のある点と無い点が混在しています (${timed.length}/${points.length})。`
  );
}
if (timed.length === 0) {
  points.forEach((p, i) => {
    p.offset = i * 1000;
  });
} else {
  const base = Date.parse(points[0].rawTime);
  if (!Number.isFinite(base)) {
    fail(`<time> を日時として読めません: ${points[0].rawTime}`);
  }
  for (const [i, p] of points.entries()) {
    const t = Date.parse(p.rawTime);
    if (!Number.isFinite(t)) {
      fail(`<time> を日時として読めません: ${p.rawTime}`);
    }
    p.offset = t - base;
    if (i > 0 && p.offset < points[i - 1].offset) {
      fail(`<time> が逆行しています: ${points[i - 1].rawTime} -> ${p.rawTime}`);
    }
  }
}

// --start が GPX の長さを超えていたら、黙って先頭へ戻さずエラーにする。
// 戻すと「指定位置から再生した」と誤認したまま全区間が流れる。
const totalMs = points[points.length - 1].offset;
if (startSec * 1000 > totalMs) {
  fail(
    `--start が GPX の長さ (${(totalMs / 1000).toFixed(0)}秒) を超えています: ${startSec}`
  );
}

// --- テストプロバイダの準備 ----------------------------------------------
const loc = (...rest) => adb('shell', 'cmd', 'location', 'providers', ...rest);

async function setup() {
  const devices = (await adb('devices'))
    .split('\n')
    .slice(1)
    .filter((l) => /\tdevice$/.test(l));
  if (devices.length === 0) throw new Error('adb に接続中のデバイスがありません');
  if (!serial && devices.length > 1)
    throw new Error(
      `デバイスが複数あります。--serial を指定してください:\n${devices.join('\n')}`
    );

  await registerProviders();
  console.log(`テストプロバイダ ${providers.join(', ')} を有効化しました`);
}

async function registerProviders() {
  // uid 2000 (adb shell) に MOCK_LOCATION を許可しないと add-test-provider が
  // SecurityException になる。
  await adb('shell', 'appops', 'set', '2000', 'android:mock_location', 'allow');

  for (const provider of providers) {
    await loc('remove-test-provider', provider).catch(() => {});
    await loc('add-test-provider', provider);
    await loc('set-test-provider-enabled', provider, 'true');
  }
}

async function teardown() {
  if (flag('keep')) return;
  for (const provider of providers) {
    await loc('set-test-provider-enabled', provider, 'false').catch(() => {});
    await loc('remove-test-provider', provider).catch(() => {});
  }
  await adb(
    'shell',
    'appops',
    'set',
    '2000',
    'android:mock_location',
    'default'
  ).catch(() => {});
  console.log(`\nテストプロバイダ ${providers.join(', ')} を削除しました`);
}

// --- 中断の扱い -----------------------------------------------------------
// シグナルでは停止を要求するだけにする。ハンドラから直接 teardown() を呼ぶと、
// 進行中の push() が失敗して registerProviders() を走らせた場合に、削除の後で
// プロバイダと appop が再設定されて端末に残る。
let stopping = false;
const sleepers = new Set();

const sleep = (ms) =>
  new Promise((resolve) => {
    if (stopping) {
      resolve();
      return;
    }
    const entry = {};
    entry.resolve = resolve;
    entry.timer = setTimeout(() => {
      sleepers.delete(entry);
      resolve();
    }, ms);
    sleepers.add(entry);
  });

const wakeAllSleepers = () => {
  for (const entry of sleepers) {
    clearTimeout(entry.timer);
    entry.resolve();
  }
  sleepers.clear();
};

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    // 2 回目は後始末を待たずに落とす。テストプロバイダが残るので、その場合は
    // 手動で remove-test-provider と appops set ... default を実行する。
    if (stopping) process.exit(130);
    stopping = true;
    wakeAllSleepers();
  });
}

// --- 投入 -----------------------------------------------------------------
// テストプロバイダは走行中に OS 側から外されることがある
// (Samsung の擬似ロケーション通知の OFF、省電力による location サービス再起動など)。
// 外れたら黙って再登録してから同じ点を打ち直す。
let reregistrations = 0;
async function push(point, acc, retry = true) {
  // --time は渡さない。ホストと端末の時計がずれていると Samsung の
  // PositionManager が "ignore mock location for time validation" で捨てるうえ、
  // handleTrackingLocation の重複破棄 (lastProcessedTimestampMs) にも引っかかる。
  // 省略すればフレームワークが端末時計で打刻する。
  const args = (provider) => [
    'set-test-provider-location',
    provider,
    '--location',
    `${point.lat.toFixed(7)},${point.lon.toFixed(7)}`,
    '--accuracy',
    String(acc),
  ];
  try {
    const results = await Promise.all(
      providers.map((provider) => loc(...args(provider)))
    );
    // cmd location は失敗しても終了コード 0 を返し、本文に例外を吐く。
    if (results.some((out) => out.includes('Exception occurred'))) {
      throw new Error(results.join('\n'));
    }
  } catch (e) {
    // 中断中は再登録しない。teardown() と競合して削除後に再設定されてしまう。
    if (!retry || stopping) throw e;
    reregistrations += 1;
    await registerProviders();
    await push(point, acc, false);
  }
}

// --- 再生 -----------------------------------------------------------------
async function play(skipSec) {
  // startSec は上で GPX の長さ以下だと検証済みで、offset は 0 始まりの非減少列
  // なので、この findIndex は必ず一致する。
  const from = points.findIndex((p) => p.offset >= skipSec * 1000);
  const originOffset = points[from].offset;
  const wallStart = Date.now();

  for (let i = from; i < points.length; i++) {
    if (stopping) return;

    const p = points[i];
    const due = wallStart + (p.offset - originOffset) / speed;
    const wait = due - Date.now();
    if (wait > 0) await sleep(wait);
    if (stopping) return;

    const acc = accuracies[i % accuracies.length];
    await push(p, acc);

    const elapsed = ((p.offset - originOffset) / 1000).toFixed(0);
    process.stdout.write(
      `\r[${i + 1}/${points.length}] +${elapsed}s  ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}  acc=${acc}m  再登録${reregistrations}回   `
    );
  }
}

let exitCode = 0;
try {
  await setup();
  // --start は初回の再生だけに効かせる。2 周目以降も先頭を飛ばすと、
  // 「終端に達したら先頭から繰り返す」という --loop の説明と食い違う。
  let isFirstLap = true;
  do {
    await play(isFirstLap ? startSec : 0);
    isFirstLap = false;
  } while (flag('loop') && !stopping);
} catch (e) {
  console.error(`\n${e.message}`);
  exitCode = 1;
}
await teardown();
process.exit(exitCode);
