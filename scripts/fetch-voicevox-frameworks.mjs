// iOS 本体アプリへ埋め込む VOICEVOX CORE の xcframework を取得する。
//
// ios/Frameworks/voicevox-frameworks.json に固定したバージョン・URL・SHA-256 の
// とおりに zip を取得し、検証してから ios/Frameworks/<name>.xcframework へ展開する。
// 展開物はリポジトリに含めない（数十 MB のバイナリで、GitHub Releases から
// 再現可能に取得できるため）。既に同じバージョンが展開済みなら取得はしない。
//
// 実行タイミング:
//   - ローカル: `npm run ios` の前段（package.json の ios スクリプト）
//   - CI: .github/workflows/build_ios_*.yml の pod install 前
//
// Android ビルドや Jest には不要なので postinstall には繋いでいない。
//
// 環境変数（いずれもテスト用で、通常は指定しない）:
//   - VOICEVOX_FRAMEWORKS_DIR: 取得先ディレクトリ（定義 JSON の置き場所）を差し替える
//   - VOICEVOX_CODESIGN: 署名し直しに使う codesign コマンドを差し替える。空文字なら署名し直しを省略する

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frameworksDir = process.env.VOICEVOX_FRAMEWORKS_DIR
  ? resolve(process.env.VOICEVOX_FRAMEWORKS_DIR)
  : resolve(scriptDir, '..', 'ios', 'Frameworks');
const manifestPath = join(frameworksDir, 'voicevox-frameworks.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// 署名し直しに使う codesign。macOS 以外には無いので、そこでは省略する
// （iOS ビルドは macOS でしか行わないため実害は無い）。
const codesignCommand =
  process.env.VOICEVOX_CODESIGN !== undefined
    ? process.env.VOICEVOX_CODESIGN
    : process.platform === 'darwin'
      ? 'codesign'
      : '';

const sha256Hex = (buffer) => createHash('sha256').update(buffer).digest('hex');

const download = async (url) => {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
};

// xcframework 配下の各スライス (<slice>/<name>.framework/Info.plist) を列挙する。
// macOS スライスは Versions/ 配下にシンボリックリンクを張っているので辿らない
// （iOS アプリには埋め込まれず、リンク先の実体は Versions/A 側で列挙される）。
const listFrameworkInfoPlists = (dir, found = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      listFrameworkInfoPlists(path, found);
    } else if (
      entry.name === 'Info.plist' &&
      /\.framework$|[\\/]Resources$/.test(dirname(path))
    ) {
      found.push(path);
    }
  }
  return found;
};

// CFBundleIdentifier に使える文字は英数字・ハイフン・ピリオドだけで、アンダースコアは不可。
// voicevox_onnxruntime 1.23.2 の iOS スライスは `jp.hiroshiba.voicevox.voicevox_onnxruntime`
// を名乗っており、Xcode の archive 時検証 (-validate-for-store) が
// "had an invalid CFBundleIdentifier in its Info.plist" で失敗する。展開後にアンダースコアを
// ハイフンへ置き換える。配布物は未署名 (_CodeSignature 無し) で、Xcode が埋め込み時に
// 署名し直すため Info.plist の書き換えは署名を壊さない。
// 既に展開済みの環境にも効くよう、取得を省略した場合にも毎回呼ぶ（冪等）。
const normalizeBundleIdentifiers = (xcframeworkDir) => {
  const rewritten = [];
  for (const plistPath of listFrameworkInfoPlists(xcframeworkDir)) {
    const source = readFileSync(plistPath, 'utf8');
    // 配布物の Info.plist は XML 形式。バイナリ plist だと下の置換が効かないので明示的に止める
    if (source.startsWith('bplist')) {
      throw new Error(
        `[voicevox] ${plistPath} is a binary plist; convert it to XML before normalizing CFBundleIdentifier`
      );
    }
    const pattern =
      /(<key>CFBundleIdentifier<\/key>\s*<string>)([^<]*)(<\/string>)/;
    const match = source.match(pattern);
    if (!match) {
      continue;
    }
    const identifier = match[2];
    if (!identifier.includes('_')) {
      continue;
    }
    const normalized = identifier.replaceAll('_', '-');
    writeFileSync(
      plistPath,
      source.replace(pattern, `$1${normalized}$3`),
      'utf8'
    );
    rewritten.push({ plistPath, from: identifier, to: normalized });
  }
  return rewritten;
};

// 各スライスの framework を ad-hoc で署名し直し、署名の識別子を CFBundleIdentifier に揃える。
// voicevox_onnxruntime 1.23.2 のバイナリには識別子 `libvoicevox_onnxruntime.1` の ad-hoc 署名が
// 埋め込まれており、Xcode は埋め込み時に `--preserve-metadata=identifier` で既存の識別子を
// 引き継ぐため、App Store Connect のアップロード検証が
// "Invalid Code Signature Identifier ... must match its Bundle Identifier" で失敗する。
// 未署名の voicevox_core は Xcode が CFBundleIdentifier から識別子を導出するので問題無いが、
// 配布物の署名状態に依存しないよう全スライスを一律に署名し直す（冪等）。
const resignFrameworks = (xcframeworkDir) => {
  const resigned = [];
  for (const plistPath of listFrameworkInfoPlists(xcframeworkDir)) {
    const frameworkDir = dirname(plistPath);
    // macOS スライス (Versions/A/Resources/Info.plist) は iOS アプリに埋め込まれないので対象外
    if (!frameworkDir.endsWith('.framework')) {
      continue;
    }
    const match = readFileSync(plistPath, 'utf8').match(
      /<key>CFBundleIdentifier<\/key>\s*<string>([^<]*)<\/string>/
    );
    if (!match) {
      continue;
    }
    const identifier = match[1];
    execFileSync(
      codesignCommand,
      ['--force', '--sign', '-', '--identifier', identifier, frameworkDir],
      { stdio: 'inherit' }
    );
    resigned.push({ frameworkDir, identifier });
  }
  return resigned;
};

for (const framework of manifest.frameworks) {
  const { name, version, url, sha256 } = framework;
  const destination = join(frameworksDir, `${name}.xcframework`);
  // 展開済みバージョンの目印。zip の中身と同じディレクトリに置いて一緒に消えるようにする
  const versionMarker = join(destination, '.trainlcd-version');

  // マーカーだけでなく xcframework の実体 (Info.plist) も確認する。中身が消えた
  // 不完全な展開物にマーカーだけ残っていると、ここで飛ばした後の Xcode ビルドが失敗する
  const installed =
    existsSync(versionMarker) &&
    existsSync(join(destination, 'Info.plist')) &&
    readFileSync(versionMarker, 'utf8').trim() === version;

  if (installed) {
    console.log(`[voicevox] ${name} ${version} is already installed`);
  } else {
    console.log(`[voicevox] downloading ${name} ${version}`);
    const zip = await download(url);
    const actual = sha256Hex(zip);
    if (actual !== sha256) {
      throw new Error(
        `[voicevox] SHA-256 mismatch for ${name}: expected ${sha256}, got ${actual}`
      );
    }

    const tempDir = mkdtempSync(join(tmpdir(), 'voicevox-'));
    try {
      const zipPath = join(tempDir, `${name}.zip`);
      writeFileSync(zipPath, zip);
      // zip のトップレベルが <name>.xcframework/ なので、展開先の親へそのまま展開する
      rmSync(destination, { recursive: true, force: true });
      execFileSync(
        'unzip',
        ['-q', '-o', zipPath, `${name}.xcframework/*`, '-d', frameworksDir],
        {
          stdio: 'inherit',
        }
      );
      if (!existsSync(join(destination, 'Info.plist'))) {
        throw new Error(
          `[voicevox] ${name}.xcframework was not found in the archive`
        );
      }
      writeFileSync(versionMarker, `${version}\n`);
      console.log(`[voicevox] installed ${name} ${version} -> ${destination}`);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

  for (const { plistPath, from, to } of normalizeBundleIdentifiers(
    destination
  )) {
    console.log(
      `[voicevox] normalized CFBundleIdentifier ${from} -> ${to} (${plistPath})`
    );
  }

  if (codesignCommand === '') {
    console.log(
      `[voicevox] skipped re-signing ${name} (codesign is unavailable on this platform)`
    );
  } else {
    for (const { frameworkDir, identifier } of resignFrameworks(destination)) {
      console.log(
        `[voicevox] re-signed ${frameworkDir} with identifier ${identifier}`
      );
    }
  }
}
