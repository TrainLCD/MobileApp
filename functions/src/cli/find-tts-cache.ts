/**
 * KV(TTS_KV) の voice:* メタを SSML 本文で検索し、必要なら KV ドキュメントと
 * R2 上の音声ファイルを削除する。旧 Firestore+GCS 版の Cloudflare 移植。
 *
 * 例:
 *   CF_ACCOUNT_ID=... CF_API_TOKEN=... CF_KV_NAMESPACE_ID=... \
 *   R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=trainlcd-tts-dev \
 *   npm run find-tts-cache -- "東京" --field ssmlJa --delete
 */
import {
  confirm,
  kvDelete,
  kvGet,
  kvListKeys,
  loadConfig,
  r2Delete,
  requireKvConfig,
  requireR2Config,
  type VoiceCacheRecord,
} from './lib/cloudflare';

interface CliArgs {
  searchTerm: string;
  field?: 'ssmlJa' | 'ssmlEn';
  exact: boolean;
  delete: boolean;
}

function printUsage(): void {
  console.error(
    'Usage: npm run find-tts-cache -- <search-term> [--field ssmlJa|ssmlEn] [--exact] [--delete]'
  );
  console.error('');
  console.error('Options:');
  console.error(
    '  --field <ssmlJa|ssmlEn>  検索対象フィールド（省略時は両方）'
  );
  console.error('  --exact                  部分一致ではなく完全一致で検索');
  console.error('  --delete                 KV ドキュメントと R2 音声を削除');
  console.error('');
  console.error(
    '接続情報は環境変数で指定: CF_ACCOUNT_ID / CF_API_TOKEN / CF_KV_NAMESPACE_ID /'
  );
  console.error('  R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET');
}

function parseArgs(argv: string[]): CliArgs | null {
  const args = argv.slice(2);
  if (args.length === 0) return null;

  let searchTerm = '';
  let field: 'ssmlJa' | 'ssmlEn' | undefined;
  let exact = false;
  let deleteMode = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--field': {
        const value = args[++i];
        if (value !== 'ssmlJa' && value !== 'ssmlEn') {
          console.error('Error: --field は "ssmlJa" か "ssmlEn" を指定');
          process.exit(1);
        }
        field = value;
        break;
      }
      case '--exact':
        exact = true;
        break;
      case '--delete':
        deleteMode = true;
        break;
      default:
        searchTerm = args[i];
        break;
    }
  }

  if (!searchTerm) return null;
  return { searchTerm, field, exact, delete: deleteMode };
}

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv);
  if (!cliArgs) {
    printUsage();
    process.exit(1);
  }

  const { searchTerm, field, exact, delete: deleteMode } = cliArgs;
  const cfg = loadConfig();
  requireKvConfig(cfg);
  if (deleteMode) requireR2Config(cfg);

  console.log(
    `検索中: "${searchTerm}"${field ? ` (${field})` : ''}${exact ? ' [完全一致]' : ''}...\n`
  );

  const keys = await kvListKeys(cfg, 'voice:');
  const matches: VoiceCacheRecord[] = [];

  const matchValue = (value: string | undefined): boolean => {
    if (!value) return false;
    return exact ? value === searchTerm : value.includes(searchTerm);
  };

  for (const key of keys) {
    const raw = await kvGet(cfg, key);
    if (!raw) continue;
    let rec: VoiceCacheRecord;
    try {
      rec = JSON.parse(raw) as VoiceCacheRecord;
    } catch {
      continue;
    }
    const hit = field
      ? matchValue(rec[field])
      : matchValue(rec.ssmlJa) || matchValue(rec.ssmlEn);
    if (hit) matches.push(rec);
  }

  if (matches.length === 0) {
    console.log('一致するドキュメントが見つかりませんでした。');
    return;
  }

  console.log(`${matches.length}件のドキュメントが見つかりました:\n`);
  for (const rec of matches) {
    console.log(`ID:         ${rec.id}`);
    console.log(`SSML (JA):  ${rec.ssmlJa ?? ''}`);
    console.log(`SSML (EN):  ${rec.ssmlEn ?? ''}`);
    console.log(`Path (JA):  ${rec.pathJa ?? ''}`);
    console.log(`Path (EN):  ${rec.pathEn ?? ''}`);
    console.log(`Voice (JA): ${rec.voiceJa ?? ''}`);
    console.log(`Voice (EN): ${rec.voiceEn ?? ''}`);
    console.log(`Created:    ${rec.createdAt ?? 'N/A'}`);
    console.log('---');
  }

  if (!deleteMode) return;

  const confirmed = await confirm(
    `\n上記 ${matches.length}件の KV ドキュメントと R2 音声ファイルを削除しますか？ (y/N): `
  );
  if (!confirmed) {
    console.log('削除をキャンセルしました。');
    return;
  }

  for (const rec of matches) {
    const id = rec.id;
    const pathJa = rec.pathJa ?? `caches/tts/ja/${id}.mp3`;
    const pathEn = rec.pathEn ?? `caches/tts/en/${id}.mp3`;
    console.log(`削除中: ${id}...`);

    const results = await Promise.allSettled([
      kvDelete(cfg, `voice:${id}`),
      r2Delete(cfg, pathJa),
      r2Delete(cfg, pathEn),
    ]);
    const labels = ['KV', 'R2 (JA)', 'R2 (EN)'];
    let hasFailure = false;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'rejected') {
        console.warn(`  ${labels[i]} の削除に失敗: ${r.reason}`);
        hasFailure = true;
      }
    }
    console.log(
      hasFailure ? `  削除完了（部分失敗）: ${id}` : `  削除完了: ${id}`
    );
  }

  console.log(`\n${matches.length}件の削除が完了しました。`);
}

main().catch((err: Error) => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
