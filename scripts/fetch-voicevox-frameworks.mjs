// iOS 本体アプリへ埋め込む VOICEVOX CORE の xcframework を取得する。
//
// ios/Frameworks/voicevox-frameworks.json に固定したバージョン・URL・SHA-256 の
// とおりに zip を取得し、検証してから ios/Frameworks/<name>.xcframework へ展開する。
// 展開物はリポジトリに含めない（数十 MB のバイナリで、GitHub Releases から
// 再現可能に取得できるため）。既に同じバージョンが展開済みなら何もしない。
//
// 実行タイミング:
//   - ローカル: `npm run ios` の前段（package.json の ios スクリプト）
//   - CI: .github/workflows/build_ios_*.yml の pod install 前
//
// Android ビルドや Jest には不要なので postinstall には繋いでいない。
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frameworksDir = resolve(scriptDir, '..', 'ios', 'Frameworks');
const manifestPath = join(frameworksDir, 'voicevox-frameworks.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const sha256Hex = (buffer) => createHash('sha256').update(buffer).digest('hex');

const download = async (url) => {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
};

for (const framework of manifest.frameworks) {
  const { name, version, url, sha256 } = framework;
  const destination = join(frameworksDir, `${name}.xcframework`);
  // 展開済みバージョンの目印。zip の中身と同じディレクトリに置いて一緒に消えるようにする
  const versionMarker = join(destination, '.trainlcd-version');

  // マーカーだけでなく xcframework の実体 (Info.plist) も確認する。中身が消えた
  // 不完全な展開物にマーカーだけ残っていると、ここで飛ばした後の Xcode ビルドが失敗する
  if (
    existsSync(versionMarker) &&
    existsSync(join(destination, 'Info.plist')) &&
    readFileSync(versionMarker, 'utf8').trim() === version
  ) {
    console.log(`[voicevox] ${name} ${version} is already installed`);
    continue;
  }

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
    execFileSync('unzip', ['-q', '-o', zipPath, `${name}.xcframework/*`, '-d', frameworksDir], {
      stdio: 'inherit',
    });
    if (!existsSync(join(destination, 'Info.plist'))) {
      throw new Error(`[voicevox] ${name}.xcframework was not found in the archive`);
    }
    writeFileSync(versionMarker, `${version}\n`);
    console.log(`[voicevox] installed ${name} ${version} -> ${destination}`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
