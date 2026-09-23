// VITS の英語音声モデル・発音辞書を配信するためのマニフェスト JSON を生成する。
//
// 使い方:
//   node scripts/build-vits-manifest.mjs <assets-dir> <base-url> [version] > manifest.json
//
//   <assets-dir> : 配信するファイルを配置したディレクトリ。次の構成を想定する。
//                    <assets-dir>/vits-ljs.onnx  … 音声モデル (ONNX)
//                    <assets-dir>/tokens.txt     … 音素 → トークン ID の対応表
//                    <assets-dir>/lexicon.txt    … 単語 → 音素列の発音辞書
//   <base-url>   : 各ファイルを配信する URL の接頭辞 (https://…/vits/<version>)
//   [version]    : 資産セットの識別子。省略時は今日の日付 (YYYY-MM-DD)
//
// 生成物の形式は src/lib/vits/manifest.ts を参照。ファイルは <assets-dir> と
// 同じ相対パスで <base-url> 配下へアップロードし、manifest.json の URL を
// Remote Config の vits_tts_manifest_url_ios で配信する。
//
// 資産は https://huggingface.co/csukuangfj/vits-ljs から取得する
// (vits-ljs.onnx / tokens.txt / lexicon.txt の 3 ファイル)。モデルは Apache-2.0、
// 学習データの LJSpeech はパブリックドメイン。
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const [assetsDir, baseUrl, versionArg] = process.argv.slice(2);
if (!assetsDir || !baseUrl) {
  console.error(
    'usage: node scripts/build-vits-manifest.mjs <assets-dir> <base-url> [version]'
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

const findOne = (label, predicate) => {
  const matched = files.filter((file) => predicate(file.path));
  if (matched.length !== 1) {
    console.error(`expected exactly one ${label}, found ${matched.length}`);
    process.exit(1);
  }
  return matched[0].path;
};

const manifest = {
  schemaVersion: 1,
  version,
  model: findOne('.onnx model', (path) => path.endsWith('.onnx')),
  tokens: findOne('tokens file', (path) => path.endsWith('tokens.txt')),
  lexicon: findOne('lexicon file', (path) => path.endsWith('lexicon.txt')),
  files,
};

process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
