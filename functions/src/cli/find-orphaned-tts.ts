/**
 * R2 に存在するが KV(TTS_KV) に voice: メタが無い「孤立」音声ファイルを検出し、
 * 必要なら削除する。旧 Firestore+GCS 版の Cloudflare 移植。
 *
 * 例:
 *   CF_ACCOUNT_ID=... CF_API_TOKEN=... CF_KV_NAMESPACE_ID=... \
 *   R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=trainlcd-tts-dev \
 *   npm run find-orphaned-tts -- --delete
 */
import {
  confirm,
  kvListKeys,
  loadConfig,
  r2Delete,
  r2ListKeys,
  requireKvConfig,
  requireR2Config,
} from './lib/cloudflare';

const ID_FROM_R2_KEY = /caches\/tts\/(?:ja|en)\/(.+)\.[^.]+$/;

function printUsage(): void {
  console.error('Usage: npm run find-orphaned-tts -- [--delete]');
  console.error('');
  console.error(
    'R2 に存在するが KV にメタが無い孤立した TTS 音声ファイルを検出します。'
  );
  console.error('  --delete                 孤立ファイルを確認後に削除');
  console.error('');
  console.error(
    '接続情報は環境変数で指定: CF_ACCOUNT_ID / CF_API_TOKEN / CF_KV_NAMESPACE_ID /'
  );
  console.error('  R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const deleteMode = args.includes('--delete');
  if (args.some((a) => a !== '--delete')) {
    printUsage();
    process.exit(1);
  }

  const cfg = loadConfig();
  requireKvConfig(cfg);
  requireR2Config(cfg);

  console.log('KV の voice: 一覧を取得中...');
  const kvKeys = await kvListKeys(cfg, 'voice:');
  const kvIds = new Set(kvKeys.map((k) => k.replace(/^voice:/, '')));
  console.log(`  KV メタ数: ${kvIds.size}`);

  console.log('R2 の音声一覧を取得中...');
  const [jaKeys, enKeys] = await Promise.all([
    r2ListKeys(cfg, 'caches/tts/ja/'),
    r2ListKeys(cfg, 'caches/tts/en/'),
  ]);

  // id → そのidに紐づく R2 オブジェクトキー
  const filesById = new Map<string, string[]>();
  for (const key of [...jaKeys, ...enKeys]) {
    const m = key.match(ID_FROM_R2_KEY);
    if (!m?.[1]) continue;
    const id = m[1];
    const arr = filesById.get(id) ?? [];
    arr.push(key);
    filesById.set(id, arr);
  }
  console.log(
    `  R2 ファイル数: JA=${jaKeys.length}, EN=${enKeys.length} (ユニークID: ${filesById.size})`
  );

  const orphanedIds = [...filesById.keys()].filter((id) => !kvIds.has(id));
  if (orphanedIds.length === 0) {
    console.log('\n孤立ファイルはありませんでした。');
    return;
  }

  console.log(`\n${orphanedIds.length}件の孤立IDが見つかりました:\n`);
  for (const id of orphanedIds) {
    console.log(`  ${id} [${(filesById.get(id) ?? []).join(', ')}]`);
  }

  if (!deleteMode) {
    console.log('\n削除するには --delete を付けて再実行してください。');
    return;
  }

  const confirmed = await confirm(
    `\n上記 ${orphanedIds.length}件の孤立ファイルを R2 から削除しますか？ (y/N): `
  );
  if (!confirmed) {
    console.log('削除をキャンセルしました。');
    return;
  }

  let deletedCount = 0;
  for (const id of orphanedIds) {
    console.log(`削除中: ${id}...`);
    const paths = filesById.get(id) ?? [];
    const results = await Promise.allSettled(
      paths.map((p) => r2Delete(cfg, p))
    );
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      for (const f of failed) {
        console.warn(`  削除失敗: ${(f as PromiseRejectedResult).reason}`);
      }
    } else {
      deletedCount++;
    }
  }

  console.log(
    `\n${deletedCount}/${orphanedIds.length}件の削除が完了しました。`
  );
}

main().catch((err: Error) => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
