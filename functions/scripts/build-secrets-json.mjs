// .secrets.env(KEY=VALUE) と GOOGLE_SA_KEY_FILE から `wrangler secret bulk` 用の
// JSON を生成する。JSON エスケープは Node に任せ、SA 鍵の改行・引用符も安全に扱う。
//
// usage: node scripts/build-secrets-json.mjs <secretsFile> <outFile>
//   - 値のあるシークレットだけを <outFile> に書き出す
//   - 1 件も無ければ exit 1
import { readFileSync, writeFileSync } from 'node:fs';

const SECRET_NAMES = [
  'SESSION_JWT_SECRET',
  'AZURE_SPEECH_KEY',
  'GOOGLE_SA_KEY',
  'OCTOKIT_PAT',
  'DISCORD_CS_WEBHOOK_URL',
  'DISCORD_CRASH_WEBHOOK_URL',
  'DISCORD_REVIEW_WEBHOOK_URL',
];

const [, , secretsFile, outFile] = process.argv;
if (!outFile) {
  process.stderr.write(
    'usage: node scripts/build-secrets-json.mjs <secretsFile> <outFile>\n'
  );
  process.exit(2);
}

const values = {};

// KEY=VALUE ファイル（存在すれば）を読む。# コメント・空行は無視、両端のクォートを除去。
try {
  const raw = readFileSync(secretsFile, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    values[key] = val;
  }
} catch {
  // ファイルが無い場合は環境変数フォールバックのみ
}

// GOOGLE_SA_KEY はファイル指定があれば中身をそのまま採用。
// 指定は 環境変数 GOOGLE_SA_KEY_FILE でも .secrets.env の GOOGLE_SA_KEY_FILE 行でも可。
const saFile = process.env.GOOGLE_SA_KEY_FILE ?? values.GOOGLE_SA_KEY_FILE;
if (saFile) {
  try {
    values.GOOGLE_SA_KEY = readFileSync(saFile, 'utf8');
  } catch (e) {
    process.stderr.write(
      `GOOGLE_SA_KEY_FILE を読めません: ${saFile} (${e.message})\n` +
        '（パスは functions/ からの相対、または絶対パスで指定してください）\n'
    );
    process.exit(2);
  }
}
// 補助キーは secret として出力しない
delete values.GOOGLE_SA_KEY_FILE;

const out = {};
for (const name of SECRET_NAMES) {
  // ファイル値 → 同名の環境変数 の順でフォールバック
  const v = values[name] ?? process.env[name];
  if (typeof v === 'string' && v.length > 0) {
    out[name] = v;
  } else {
    process.stderr.write(`skip (no value): ${name}\n`);
  }
}

const keys = Object.keys(out);
if (keys.length === 0) {
  process.stderr.write('no secrets to put\n');
  process.exit(1);
}

writeFileSync(outFile, JSON.stringify(out));
process.stderr.write(`prepared ${keys.length}: ${keys.join(', ')}\n`);
