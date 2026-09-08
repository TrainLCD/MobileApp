// VOICEVOX の辞書・音声モデルを配信するためのマニフェスト JSON を生成する。
//
// 使い方:
//   node scripts/build-voicevox-manifest.mjs <assets-dir> <base-url> [version] > manifest.json
//
//   <assets-dir> : 配信するファイルを配置したディレクトリ。次の構成を想定する。
//                    <assets-dir>/open_jtalk_dic_utf_8-1.11/   … Open JTalk 辞書 (展開済み)
//                    <assets-dir>/6.vvm                        … 音声モデル (VVM)
//   <base-url>   : 各ファイルを配信する URL の接頭辞 (https://…/voicevox/<version>)
//   [version]    : 資産セットの識別子。省略時は今日の日付 (YYYY-MM-DD)
//
// 生成物の形式は src/lib/voicevox/manifest.ts を参照。ファイルは <assets-dir> と
// 同じ相対パスで <base-url> 配下へアップロードし、manifest.json の URL を
// Remote Config の voicevox_tts_manifest_url_ios で配信する。
//
// 辞書は https://github.com/r9y9/open_jtalk/releases (open_jtalk_dic_utf_8-1.11.tar.gz)、
// VVM は https://github.com/VOICEVOX/voicevox_vvm/releases から取得する。
// VVM の利用規約 (クレジット表記など) は voicevox_vvm の README を参照。
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const [assetsDir, baseUrl, versionArg] = process.argv.slice(2);
if (!assetsDir || !baseUrl) {
  console.error(
    'usage: node scripts/build-voicevox-manifest.mjs <assets-dir> <base-url> [version]'
  );
  process.exit(1);
}
if (!baseUrl.startsWith('https://')) {
  console.error('base-url must start with https://');
  process.exit(1);
}

const version = versionArg ?? new Date().toISOString().slice(0, 10);

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }
    // 隠しファイル (.DS_Store など) は配信対象にしない
    return entry.name.startsWith('.') ? [] : [full];
  });

const files = walk(assetsDir)
  .map((full) => {
    const path = relative(assetsDir, full).split(sep).join('/');
    const buffer = readFileSync(full);
    return {
      path,
      url: `${baseUrl.replace(/\/$/, '')}/${path}`,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      bytes: statSync(full).size,
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

const voiceModels = files
  .map((file) => file.path)
  .filter((path) => path.endsWith('.vvm'));
const dicDirs = [
  ...new Set(
    files
      .filter((file) => file.path.endsWith('/sys.dic'))
      .map((file) => file.path.slice(0, -'/sys.dic'.length))
  ),
];

if (voiceModels.length === 0) {
  console.error('no .vvm file found');
  process.exit(1);
}
if (dicDirs.length !== 1) {
  console.error(
    `expected exactly one Open JTalk dictionary, found ${dicDirs.length}`
  );
  process.exit(1);
}

const manifest = {
  schemaVersion: 1,
  version,
  openJtalkDicDir: dicDirs[0],
  voiceModels,
  files,
};

process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
