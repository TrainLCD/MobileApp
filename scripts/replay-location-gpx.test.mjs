// replay-location-gpx.mjs の行先の取得と表示に対する回帰テスト。
// adb と StationAPI を偽物に差し替えて、端末もネットワークも無しで最後まで再生させる:
//   node --test scripts/replay-location-gpx.test.mjs

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const script = fileURLToPath(
  new URL('./replay-location-gpx.mjs', import.meta.url)
);
const dir = mkdtempSync(join(tmpdir(), 'replay-gpx-test-'));

// devices には 1 台つながっていると答え、それ以外の呼び出しは何もせず成功する。
writeFileSync(
  join(dir, 'adb'),
  [
    '#!/bin/sh',
    `echo "$@" >> '${join(dir, 'adb.log')}'`,
    'if [ "$1" = "devices" ]; then',
    '  printf "List of devices attached\\nemulator-5554\\tdevice\\n"',
    'fi',
    '',
  ].join('\n')
);
chmodSync(join(dir, 'adb'), 0o755);

const adbLog = join(dir, 'adb.log');
const gpxPath = join(dir, 'track.gpx');
writeFileSync(
  gpxPath,
  [
    '<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">',
    '<wpt lat="35.0" lon="139.0"><time>2026-01-01T00:00:00Z</time></wpt>',
    '<wpt lat="35.6574160" lon="139.3438510"><time>2026-01-01T00:00:01Z</time></wpt>',
    '</gpx>',
  ].join('\n')
);

let requests = [];
let respond = () => ({ status: 200, body: {} });
const server = createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
  });
  req.on('end', () => {
    requests.push(JSON.parse(raw));
    const { status, body } = respond();
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  });
});

before(() => new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)));
after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

// サーバと同じプロセスで待つので、execFileSync ではなく非同期で起動する。
const replay = async () => {
  requests = [];
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [script, '--gpx', gpxPath, '--speed', '1000'],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${dir}:${process.env.PATH}`,
        GQL_API_URL: `http://127.0.0.1:${server.address().port}/`,
      },
    }
  );
  return { stdout, stderr };
};

test('終点の座標で 1 回だけ問い合わせ、行先を開始時と進捗行に表示する', async () => {
  respond = () => ({
    status: 200,
    body: { data: { stationsNearby: [{ name: '京王八王子' }] } },
  });
  const { stdout } = await replay();
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].variables, {
    latitude: 35.657416,
    longitude: 139.343851,
  });
  assert.match(stdout, /^行先: 京王八王子$/m);
  assert.match(stdout, /\[2\/2\] 京王八王子行 /);
});

test('行先を引けなければ、テストプロバイダに触れずに異常終了する', async () => {
  for (const [response, message] of [
    [{ status: 500, body: {} }, 'HTTP 500'],
    [
      { status: 200, body: { data: { stationsNearby: [] } } },
      '終点の座標の近くに駅が見つかりません',
    ],
    [{ status: 200, body: { errors: [{ message: 'boom' }] } }, 'boom'],
  ]) {
    respond = () => response;
    writeFileSync(adbLog, '');
    await assert.rejects(replay(), (error) => {
      assert.equal(error.code, 1);
      assert.match(
        error.stderr,
        new RegExp(`行先を取得できませんでした: ${message}`)
      );
      return true;
    });
    assert.equal(readFileSync(adbLog, 'utf8'), '');
  }
});
