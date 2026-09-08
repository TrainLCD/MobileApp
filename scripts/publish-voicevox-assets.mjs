// VOICEVOX の辞書・音声モデルを Cloudflare R2 へ配信し、マニフェストを生成して置く。
//
// 使い方:
//   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_ZONE_ID=… \
//     node scripts/publish-voicevox-assets.mjs <assets-dir> [version]
//
//   <assets-dir> : build-voicevox-manifest.mjs と同じ構成のディレクトリ
//                  (open_jtalk_dic_utf_8-1.11/ と *.vvm)。manifest.json は含めない。
//   [version]    : 資産セットの識別子。省略時は今日の日付 (YYYY-MM-DD)
//
// 環境変数:
//   CLOUDFLARE_ACCOUNT_ID  アカウント ID (秘密ではない)
//   CLOUDFLARE_ZONE_ID     独自ドメインを置くゾーン (trainlcd.app) の ID (秘密ではない)
//   CLOUDFLARE_API_TOKEN   省略可。Workers R2 Storage: Edit と対象ゾーンの DNS: Edit を持つトークン。
//                          手元の Mac で実行するときだけ設定する。Claude Code のクラウド環境では
//                          「API credentials」に api.cloudflare.com 向けとして登録しておけば
//                          プロキシが Authorization ヘッダーを付けるので、環境変数には入れない
//   VOICEVOX_R2_BUCKET     バケット名 (既定: trainlcd-assets)
//   VOICEVOX_ASSETS_HOST   バケットに紐付ける独自ドメイン (既定: assets.trainlcd.app)
//
// 配信先の構成:
//   https://<host>/voicevox/manifest.json      … 5 分キャッシュ。Remote Config に入れる固定 URL
//   https://<host>/voicevox/<version>/<path>   … 不変なので長期キャッシュ
//
// Cloudflare API (https://api.cloudflare.com/client/v4) を curl で直接呼ぶ。wrangler を使わないのは、
// wrangler がローカルにトークンを要求するため、上記のプロキシ経由の認証と両立しないから。
// オブジェクトの PUT は wrangler `r2 object put` と同じエンドポイントと
// ヘッダー (content-type / cache-control) を使う。
// 何度実行しても同じ結果になる (バケット・ドメインは存在すれば作らない、
// オブジェクトは同じ内容で上書き)。
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const [assetsDirArg, versionArg] = process.argv.slice(2);
if (!assetsDirArg) {
  console.error(
    'usage: node scripts/publish-voicevox-assets.mjs <assets-dir> [version]'
  );
  process.exit(1);
}
for (const name of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ZONE_ID']) {
  if (!process.env[name]) {
    console.error(`${name} is not set`);
    process.exit(1);
  }
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const assetsDir = resolve(assetsDirArg);
const version = versionArg ?? new Date().toISOString().slice(0, 10);
const bucket = process.env.VOICEVOX_R2_BUCKET ?? 'trainlcd-assets';
const host = process.env.VOICEVOX_ASSETS_HOST ?? 'assets.trainlcd.app';
const prefix = `voicevox/${version}`;
const baseUrl = `https://${host}/${prefix}`;
const manifestKey = 'voicevox/manifest.json';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiBase = 'https://api.cloudflare.com/client/v4';

const workDir = mkdtempSync(join(tmpdir(), 'voicevox-publish-'));
process.on('exit', () => rmSync(workDir, { recursive: true, force: true }));

// トークンはコマンドラインに載せず (ps で見える)、curl の -H @file で渡す
const authHeaderFile = join(workDir, 'auth-header');
const hasLocalToken = Boolean(process.env.CLOUDFLARE_API_TOKEN);
if (hasLocalToken) {
  writeFileSync(
    authHeaderFile,
    `Authorization: Bearer ${process.env.CLOUDFLARE_API_TOKEN}\n`,
    { mode: 0o600 }
  );
}

/**
 * Cloudflare API を呼び、レスポンス JSON を返す。HTTP エラーはメッセージ付きで投げる。
 * body は JSON (json) かファイル (file) のどちらか。
 */
const cf = (method, path, { json, file, headers = {} } = {}) => {
  const args = [
    '-sS',
    '-X',
    method,
    '--retry',
    '3',
    '--retry-all-errors',
    '-o',
    join(workDir, 'response.json'),
    '-w',
    '%{http_code}',
  ];
  if (hasLocalToken) {
    args.push('-H', `@${authHeaderFile}`);
  }
  for (const [name, value] of Object.entries(headers)) {
    args.push('-H', `${name}: ${value}`);
  }
  if (json !== undefined) {
    args.push(
      '-H',
      'Content-Type: application/json',
      '--data',
      JSON.stringify(json)
    );
  }
  if (file !== undefined) {
    args.push('--data-binary', `@${file}`);
  }
  args.push(`${apiBase}${path}`);
  const result = spawnSync('curl', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`curl ${method} ${path} failed: ${result.stderr.trim()}`);
  }
  const status = Number(result.stdout.trim());
  const text = readResponse();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // オブジェクト系エンドポイントは JSON 以外を返すことがある
  }
  if (status < 200 || status >= 300 || (parsed && parsed.success === false)) {
    const detail =
      parsed?.errors?.map((e) => `${e.code}: ${e.message}`).join('; ') ??
      text.slice(0, 300);
    throw new Error(`${method} ${path} -> HTTP ${status}: ${detail}`);
  }
  return parsed;
};
const readResponse = () => readFileSync(join(workDir, 'response.json'), 'utf8');

const step = (title) => console.log(`\n== ${title}`);

// スタックトレースではなく原因だけを出す。認証系の失敗は対処法も添える
process.on('uncaughtException', (error) => {
  console.error(`\nerror: ${error.message}`);
  if (/HTTP (400|401|403)/.test(error.message)) {
    console.error(
      'Cloudflare API の認証に失敗した。手元なら CLOUDFLARE_API_TOKEN を、' +
        'Claude Code のクラウド環境なら環境設定の API credentials (api.cloudflare.com) を確認する'
    );
  }
  process.exit(1);
});

step('auth');
const who = cf('GET', '/user/tokens/verify');
console.log(`token status: ${who.result?.status ?? 'unknown'}`);

step(`bucket ${bucket}`);
const buckets =
  cf('GET', `/accounts/${accountId}/r2/buckets`).result?.buckets ?? [];
if (buckets.some((b) => b.name === bucket)) {
  console.log('exists');
} else {
  cf('POST', `/accounts/${accountId}/r2/buckets`, { json: { name: bucket } });
  console.log('created');
}

step(`custom domain ${host}`);
const domains =
  cf('GET', `/accounts/${accountId}/r2/buckets/${bucket}/domains/custom`).result
    ?.domains ?? [];
if (domains.some((d) => d.domain === host)) {
  console.log('already attached');
} else {
  cf('POST', `/accounts/${accountId}/r2/buckets/${bucket}/domains/custom`, {
    json: { domain: host, zoneId, enabled: true, minTLS: '1.2' },
  });
  console.log(
    'attached (DNS レコードは Cloudflare が自動で作る。反映まで数分かかることがある)'
  );
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }
    return entry.name.startsWith('.') ? [] : [full];
  });

const contentTypeOf = (path) =>
  path.endsWith('.def') || path.endsWith('COPYING')
    ? 'text/plain'
    : 'application/octet-stream';

const putObject = (key, file, contentType, cacheControl) =>
  cf(
    'PUT',
    `/accounts/${accountId}/r2/buckets/${bucket}/objects/${key
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
    {
      file,
      headers: { 'content-type': contentType, 'cache-control': cacheControl },
    }
  );

step(`upload ${prefix}/`);
const files = walk(assetsDir).sort();
if (files.some((full) => full.endsWith('manifest.json'))) {
  console.error('assets-dir must not contain manifest.json');
  process.exit(1);
}
for (const full of files) {
  const path = relative(assetsDir, full).split(sep).join('/');
  console.log(`put ${path} (${statSync(full).size} bytes)`);
  putObject(
    `${prefix}/${path}`,
    full,
    contentTypeOf(path),
    'public, max-age=31536000, immutable'
  );
}

step('manifest');
const manifest = execFileSync(
  process.execPath,
  [
    join(repoRoot, 'scripts/build-voicevox-manifest.mjs'),
    assetsDir,
    baseUrl,
    version,
  ],
  { encoding: 'utf8' }
);
const manifestPath = join(workDir, 'manifest.json');
writeFileSync(manifestPath, manifest);
putObject(manifestKey, manifestPath, 'application/json', 'public, max-age=300');

step('verify');
const manifestUrl = `https://${host}/${manifestKey}`;
let failed = false;
for (const url of [
  manifestUrl,
  ...JSON.parse(manifest).files.map((file) => file.url),
]) {
  const result = spawnSync(
    'curl',
    ['-sS', '-I', '-o', '/dev/null', '-w', '%{http_code}', url],
    { encoding: 'utf8' }
  );
  const status = result.stdout.trim();
  console.log(`${status} ${url}`);
  if (status !== '200') {
    failed = true;
  }
}
if (failed) {
  console.error(
    '一部の URL に到達できない。独自ドメインの反映待ちなら数分後に再実行する'
  );
  process.exitCode = 1;
}

console.log(`\nRemote Config: voicevox_tts_manifest_url_ios = ${manifestUrl}`);
