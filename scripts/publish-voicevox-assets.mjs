// VOICEVOX の辞書・音声モデルを Cloudflare R2 へ配信し、マニフェストを生成して置く。
//
// 使い方:
//   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_ZONE_ID=… \
//     node scripts/publish-voicevox-assets.mjs <assets-dir> [version]
//
//   <assets-dir> : build-voicevox-manifest.mjs と同じ構成のディレクトリ
//                  (open_jtalk_dic_utf_8-1.11/ と *.vvm)。manifest.json は含めない。
//   [version]    : 資産セットの識別子。省略時は今日の日付 (YYYY-MM-DD)
//
// 環境変数:
//   CLOUDFLARE_API_TOKEN   Workers R2 Storage: Edit と、対象ゾーンの DNS: Edit を持つトークン
//   CLOUDFLARE_ACCOUNT_ID  アカウント ID
//   CLOUDFLARE_ZONE_ID     独自ドメインを置くゾーン (trainlcd.app) の ID
//   VOICEVOX_R2_BUCKET     バケット名 (既定: trainlcd-assets)
//   VOICEVOX_ASSETS_HOST   バケットに紐付ける独自ドメイン (既定: assets.trainlcd.app)
//
// 配信先の構成:
//   https://<host>/voicevox/manifest.json      … 5 分キャッシュ。Remote Config に入れる固定 URL
//   https://<host>/voicevox/<version>/<path>   … 不変なので長期キャッシュ
//
// 何度実行しても同じ結果になる (バケット・ドメインは存在すれば作らない、
// オブジェクトは同じ内容で上書き)。wrangler は npx で取得するため事前インストール不要。
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs';
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
for (const name of [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_ZONE_ID',
]) {
  if (!process.env[name]) {
    console.error(`${name} is not set`);
    process.exit(1);
  }
}

const assetsDir = resolve(assetsDirArg);
const version = versionArg ?? new Date().toISOString().slice(0, 10);
const bucket = process.env.VOICEVOX_R2_BUCKET ?? 'trainlcd-assets';
const host = process.env.VOICEVOX_ASSETS_HOST ?? 'assets.trainlcd.app';
const prefix = `voicevox/${version}`;
const baseUrl = `https://${host}/${prefix}`;
const manifestKey = 'voicevox/manifest.json';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// wrangler は CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID を環境変数から読む
const wrangler = (args, { capture = false } = {}) => {
  const result = spawnSync('npx', ['--yes', 'wrangler@4', ...args], {
    cwd: repoRoot,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`wrangler ${args.join(' ')} failed (${result.status})`);
  }
  return result.stdout ?? '';
};

const step = (title) => console.log(`\n== ${title}`);

step(`bucket ${bucket}`);
const bucketList = wrangler(['r2', 'bucket', 'list'], { capture: true });
if (new RegExp(`(^|\\s)name:\\s*${bucket}(\\s|$)`).test(bucketList)) {
  console.log('exists');
} else {
  wrangler(['r2', 'bucket', 'create', bucket]);
}

step(`custom domain ${host}`);
const domainList = wrangler(['r2', 'bucket', 'domain', 'list', bucket], {
  capture: true,
});
if (domainList.includes(host)) {
  console.log('already attached');
} else {
  wrangler([
    'r2',
    'bucket',
    'domain',
    'add',
    bucket,
    '--domain',
    host,
    '--zone-id',
    process.env.CLOUDFLARE_ZONE_ID,
    '--min-tls',
    '1.2',
    '--force',
  ]);
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

step(`upload ${prefix}/`);
const files = walk(assetsDir).sort();
if (files.some((full) => full.endsWith('manifest.json'))) {
  console.error('assets-dir must not contain manifest.json');
  process.exit(1);
}
for (const full of files) {
  const path = relative(assetsDir, full).split(sep).join('/');
  console.log(`put ${path} (${statSync(full).size} bytes)`);
  wrangler([
    'r2',
    'object',
    'put',
    `${bucket}/${prefix}/${path}`,
    '--file',
    full,
    '--content-type',
    contentTypeOf(path),
    '--cache-control',
    'public, max-age=31536000, immutable',
    '--remote',
  ]);
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
const manifestPath = join(
  mkdtempSync(join(tmpdir(), 'voicevox-')),
  'manifest.json'
);
writeFileSync(manifestPath, manifest);
wrangler([
  'r2',
  'object',
  'put',
  `${bucket}/${manifestKey}`,
  '--file',
  manifestPath,
  '--content-type',
  'application/json',
  '--cache-control',
  'public, max-age=300',
  '--remote',
]);

step('verify');
const manifestUrl = `https://${host}/${manifestKey}`;
for (const url of [
  manifestUrl,
  ...JSON.parse(manifest).files.map((file) => file.url),
]) {
  const response = await fetch(url, { method: 'HEAD' });
  console.log(`${response.status} ${url}`);
  if (!response.ok) {
    process.exitCode = 1;
  }
}

console.log(`\nRemote Config: voicevox_tts_manifest_url_ios = ${manifestUrl}`);
