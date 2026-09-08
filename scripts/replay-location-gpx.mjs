#!/usr/bin/env node
// GPX を Android のテストプロバイダ経由で流し込む。
// 実機・エミュレータのどちらでも動く (adb shell cmd location providers)。
// 使い方:
//   npm run gpx:replay -- --gpx ios/SampleTohokuShinkansen.gpx [options]
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

if (flag('help') || !opt('gpx')) {
  console.log(`使い方: npm run gpx:replay -- --gpx <file> [options]

  --gpx <path>        再生する GPX (必須)
  --serial <serial>   adb のデバイスシリアル (省略時は接続中の 1 台)
  --provider <names>  テストプロバイダ名 (カンマ区切り)。既定 gps,network,fused
                      Play 開発者サービスの Fused は gps/network を見るため
                      既定では 3 つすべてに同じ座標を流す
  --speed <n>         再生倍率。既定 1 (GPX の <time> どおり)
  --accuracy <m>      水平精度 (m)。既定 8。カンマ区切りで区間ごとに巡回
  --start <sec>       GPX 先頭からのスキップ秒数
  --loop              終端に達したら先頭から繰り返す
  --keep              終了時にテストプロバイダを削除しない`);
  process.exit(opt('gpx') ? 0 : 1);
}

const serial = opt('serial');
const providers = String(opt('provider', 'gps,network,fused'))
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const speed = Number(opt('speed', '1'));
const accuracies = String(opt('accuracy', '8'))
  .split(',')
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v) && v > 0);
const startSec = Number(opt('start', '0'));

const adbArgs = (...rest) => (serial ? ['-s', serial, ...rest] : rest);
const adb = async (...rest) => {
  const { stdout, stderr } = await execFileAsync('adb', adbArgs(...rest), {
    maxBuffer: 1 << 22,
  });
  return `${stdout}${stderr}`.trim();
};

// --- GPX 読み込み ---------------------------------------------------------
const xml = readFileSync(opt('gpx'), 'utf8');
const points = [];
const wptRe =
  /<wpt[^>]*\blat="([-\d.]+)"[^>]*\blon="([-\d.]+)"[^>]*>([\s\S]*?)<\/wpt>/g;
for (let m; (m = wptRe.exec(xml)); ) {
  const timeMatch = /<time>([^<]+)<\/time>/.exec(m[3]);
  points.push({
    lat: Number(m[1]),
    lon: Number(m[2]),
    t: timeMatch ? Date.parse(timeMatch[1]) : null,
  });
}
if (points.length === 0) {
  console.error('GPX に <wpt> が見つかりません');
  process.exit(1);
}
// <time> が無い GPX は 1Hz とみなす
const base = points[0].t ?? 0;
for (const [i, p] of points.entries()) {
  p.offset = p.t === null ? i * 1000 : p.t - base;
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
    throw new Error(`デバイスが複数あります。--serial を指定してください:\n${devices.join('\n')}`);

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
  await adb('shell', 'appops', 'set', '2000', 'android:mock_location', 'default').catch(
    () => {}
  );
  console.log(`\nテストプロバイダ ${providers.join(', ')} を削除しました`);
}

// --- 再生 -----------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function play() {
  const first = points.findIndex((p) => p.offset >= startSec * 1000);
  const from = first === -1 ? 0 : first;
  const originOffset = points[from].offset;
  const wallStart = Date.now();

  for (let i = from; i < points.length; i++) {
    const p = points[i];
    const due = wallStart + (p.offset - originOffset) / speed;
    const wait = due - Date.now();
    if (wait > 0) await sleep(wait);

    const acc = accuracies[i % accuracies.length];
    await push(p, acc);

    const elapsed = ((p.offset - originOffset) / 1000).toFixed(0);
    process.stdout.write(
      `\r[${i + 1}/${points.length}] +${elapsed}s  ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}  acc=${acc}m  再登録${reregistrations}回   `
    );
  }
}

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
    if (!retry) throw e;
    reregistrations += 1;
    await registerProviders();
    await push(point, acc, false);
  }
}

let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    if (stopping) process.exit(1);
    stopping = true;
    await teardown();
    process.exit(0);
  });
}

try {
  await setup();
  do {
    await play();
  } while (flag('loop') && !stopping);
  await teardown();
} catch (e) {
  console.error(`\n${e.message}`);
  await teardown();
  process.exit(1);
}
