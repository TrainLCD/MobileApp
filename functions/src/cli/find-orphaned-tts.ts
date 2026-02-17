import * as readline from 'node:readline';
import type { Bucket } from '@google-cloud/storage';
import admin from 'firebase-admin';

function printUsage(): void {
  console.error(
    'Usage: npm run find-orphaned-tts -- --bucket <name> --project <project-id> [--delete]'
  );
  console.error('');
  console.error(
    'Storageに存在するがFirestoreにドキュメントがない孤立したTTSキャッシュファイルを検出します。'
  );
  console.error('');
  console.error('Options:');
  console.error('  --bucket <name>          Cloud Storageバケット名（必須）');
  console.error('  --project <project-id>   Firebaseプロジェクトを指定（必須）');
  console.error('  --delete                 孤立ファイルを確認後に削除');
}

interface CliArgs {
  bucket: string;
  projectId: string;
  delete: boolean;
}

function parseArgs(argv: string[]): CliArgs | null {
  const args = argv.slice(2);

  let bucket: string | undefined;
  let projectId: string | undefined;
  let deleteMode = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--bucket':
        bucket = args[++i];
        break;
      case '--project':
        projectId = args[++i];
        break;
      case '--delete':
        deleteMode = true;
        break;
    }
  }

  const resolved = projectId ?? process.env.GCLOUD_PROJECT;
  if (!bucket || !resolved) {
    return null;
  }

  return { bucket, projectId: resolved, delete: deleteMode };
}

const PAGE_SIZE = 1000;

async function collectStorageIds(
  bucket: Bucket,
  prefix: string
): Promise<Set<string>> {
  const ids = new Set<string>();
  let pageToken: string | undefined;

  do {
    const [files, , apiResponse] = await bucket.getFiles({
      prefix,
      maxResults: PAGE_SIZE,
      autoPaginate: false,
      pageToken,
    });

    for (const file of files) {
      const match = file.name.match(
        /caches\/tts\/(?:ja|en)\/(.+)\.mp3$/
      );
      if (match?.[1]) {
        ids.add(match[1]);
      }
    }

    pageToken = (apiResponse as { nextPageToken?: string } | undefined)
      ?.nextPageToken;
    if (pageToken) {
      process.stdout.write(`\r  ${prefix} ... ${ids.size}件取得済み`);
    }
  } while (pageToken);

  process.stdout.write(`\r  ${prefix} ... ${ids.size}件 完了\n`);
  return ids;
}

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv);

  if (!cliArgs) {
    printUsage();
    process.exit(1);
  }

  const { bucket: bucketName, projectId, delete: deleteMode } = cliArgs;

  const app = admin.initializeApp({
    projectId,
    storageBucket: bucketName,
  });
  const firestore = app.firestore();
  const bucket = app.storage().bucket();

  // Firestore のドキュメントID一覧を取得
  console.log('Firestoreのドキュメント一覧を取得中...');
  const voicesRef = firestore
    .collection('caches')
    .doc('tts')
    .collection('voices');
  const firestoreSnapshot = await voicesRef.select().get();
  const firestoreIds = new Set(firestoreSnapshot.docs.map((doc) => doc.id));
  console.log(`  Firestoreドキュメント数: ${firestoreIds.size}`);

  // Storage のファイルIDをページネーションで取得（メモリ節約）
  console.log('Storageのファイル一覧を取得中...');
  const [jaIds, enIds] = await Promise.all([
    collectStorageIds(bucket, 'caches/tts/ja/'),
    collectStorageIds(bucket, 'caches/tts/en/'),
  ]);
  const storageIds = new Set([...jaIds, ...enIds]);
  console.log(`  Storageファイル数: JA=${jaIds.size}, EN=${enIds.size} (ユニークID: ${storageIds.size})`);

  // 孤立ID = Storage にあるが Firestore にない
  const orphanedIds = [...storageIds].filter((id) => !firestoreIds.has(id));

  if (orphanedIds.length === 0) {
    console.log('\n孤立ファイルはありませんでした。');
    return;
  }

  console.log(`\n${orphanedIds.length}件の孤立IDが見つかりました:\n`);

  const orphanedFiles: { id: string; ja: boolean; en: boolean }[] = [];
  for (const id of orphanedIds) {
    const hasJa = jaIds.has(id);
    const hasEn = enIds.has(id);
    orphanedFiles.push({ id, ja: hasJa, en: hasEn });

    const flags = [hasJa ? 'JA' : null, hasEn ? 'EN' : null]
      .filter(Boolean)
      .join(', ');
    console.log(`  ${id} [${flags}]`);
  }

  if (!deleteMode) {
    console.log(
      '\n削除するには --delete オプションを付けて再実行してください。'
    );
    return;
  }

  const confirmed = await confirm(
    `\n上記 ${orphanedIds.length}件の孤立ファイルをStorageから削除しますか？ (y/N): `
  );
  if (!confirmed) {
    console.log('削除をキャンセルしました。');
    return;
  }

  let deletedCount = 0;
  for (const { id, ja, en } of orphanedFiles) {
    console.log(`削除中: ${id}...`);

    const promises: Promise<unknown>[] = [];
    if (ja) promises.push(bucket.file(`caches/tts/ja/${id}.mp3`).delete());
    if (en) promises.push(bucket.file(`caches/tts/en/${id}.mp3`).delete());

    const results = await Promise.allSettled(promises);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      for (const f of failed) {
        console.warn(
          `  削除失敗: ${(f as PromiseRejectedResult).reason}`
        );
      }
    } else {
      deletedCount++;
    }
  }

  console.log(`\n${deletedCount}/${orphanedFiles.length}件の削除が完了しました。`);
}

function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

main()
  .catch((err: Error) => {
    console.error('Error:', err.message);
    process.exit(1);
  })
  .finally(() => process.exit(0));
