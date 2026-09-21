// EAS Build で Android をビルドするときに、Firebase の google-services.json を
// android/app/ へ置く。
//
// google-services.json は Git 管理外なので、EAS へ送られるプロジェクトには含まれない。
// EAS のファイル型環境変数 GOOGLE_SERVICES_JSON に登録しておくと、ビルド時には
// そのファイルのパスが入る。環境変数は EAS の環境（development / production）ごとに
// 登録するので、Canary と Production で別のファイルを使える。
//
// 実行タイミング: package.json の eas-build-pre-install フック（npm install より前）。
// iOS のビルドでは何もしない（GoogleService-Info.plist は .eas/workflows/ の各ステップで復元する）。
//
// 環境変数:
//   - EAS_BUILD_PLATFORM: EAS Build が設定する。android 以外なら何もしない
//   - GOOGLE_SERVICES_JSON: ファイル型環境変数。google-services.json のパス
//   - GOOGLE_SERVICES_DEST: 置き先を差し替える（テスト用。通常は指定しない）

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const fail = (message) => {
  console.error(`[eas-restore-google-services] ${message}`);
  process.exit(1);
};

if (process.env.EAS_BUILD_PLATFORM !== 'android') {
  process.exit(0);
}

const source = process.env.GOOGLE_SERVICES_JSON;
if (!source) {
  fail(
    'GOOGLE_SERVICES_JSON is not set. Register google-services.json as a file environment variable for this EAS environment.'
  );
}
if (!existsSync(source)) {
  fail(`GOOGLE_SERVICES_JSON points to a missing file: ${source}`);
}

// 中身を取り違えたファイル（plist など）を置くと、Gradle の途中で分かりにくい失敗になる。
// ここで形を確かめて早めに落とす
let parsed;
try {
  parsed = JSON.parse(readFileSync(source, 'utf8'));
} catch {
  fail('GOOGLE_SERVICES_JSON is not valid JSON.');
}
if (!Array.isArray(parsed?.client) || parsed.client.length === 0) {
  fail('GOOGLE_SERVICES_JSON does not look like google-services.json (no "client" entries).');
}

const destination =
  process.env.GOOGLE_SERVICES_DEST ??
  resolve(dirname(fileURLToPath(import.meta.url)), '../android/app/google-services.json');
mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log(`[eas-restore-google-services] Wrote ${destination}`);
