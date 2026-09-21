import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'eas-restore-google-services.mjs'
);

const googleServices = JSON.stringify({
  project_info: { project_id: 'dummy' },
  client: [
    {
      client_info: {
        android_client_info: { package_name: 'me.tinykitten.trainlcd.dev' },
      },
    },
  ],
});

// 実行環境の EAS_BUILD_PLATFORM / GOOGLE_SERVICES_JSON が紛れ込まないよう、
// 必要なものだけを渡す
const run = (env) =>
  spawnSync(process.execPath, [scriptPath], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, ...env },
  });

const setup = (content = googleServices) => {
  const dir = mkdtempSync(join(tmpdir(), 'eas-google-services-'));
  const source = join(dir, 'secret.json');
  writeFileSync(source, content);
  return { source, destination: join(dir, 'android', 'app', 'google-services.json') };
};

test('Android のビルドではファイル型環境変数の中身を置き先へコピーする', () => {
  const { source, destination } = setup();
  const result = run({
    EAS_BUILD_PLATFORM: 'android',
    GOOGLE_SERVICES_JSON: source,
    GOOGLE_SERVICES_DEST: destination,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(destination, 'utf8'), googleServices);
});

test('iOS のビルドでは環境変数が無くても何もせずに終わる', () => {
  const { destination } = setup();
  const result = run({ EAS_BUILD_PLATFORM: 'ios', GOOGLE_SERVICES_DEST: destination });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(destination), false);
});

test('EAS の外（EAS_BUILD_PLATFORM が無い）では何もしない', () => {
  const { source, destination } = setup();
  const result = run({ GOOGLE_SERVICES_JSON: source, GOOGLE_SERVICES_DEST: destination });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(destination), false);
});

test('Android で環境変数が未登録ならビルドを止める', () => {
  const { destination } = setup();
  const result = run({ EAS_BUILD_PLATFORM: 'android', GOOGLE_SERVICES_DEST: destination });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GOOGLE_SERVICES_JSON is not set/);
  assert.equal(existsSync(destination), false);
});

test('JSON でないファイルや client の無い JSON は置かずに止める', () => {
  for (const content of ['<plist></plist>', JSON.stringify({ client: [] })]) {
    const { source, destination } = setup(content);
    const result = run({
      EAS_BUILD_PLATFORM: 'android',
      GOOGLE_SERVICES_JSON: source,
      GOOGLE_SERVICES_DEST: destination,
    });
    assert.equal(result.status, 1, content);
    assert.equal(existsSync(destination), false, content);
  }
});
