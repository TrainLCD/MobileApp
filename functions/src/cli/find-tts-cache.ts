import * as readline from 'node:readline';
import admin from 'firebase-admin';

function printUsage(): void {
  console.error(
    'Usage: npm run find-tts-cache -- <search-term> [--field ssmlJa|ssmlEn] [--exact] [--delete] [--bucket <name>] [--project <project-id>]'
  );
  console.error('');
  console.error('Options:');
  console.error(
    '  --field <ssmlJa|ssmlEn>  検索対象フィールドを指定（省略時は両方）'
  );
  console.error('  --exact                  部分一致ではなく完全一致で検索');
  console.error(
    '  --delete                 検索結果を確認後、FirestoreドキュメントとストレージのMP3を削除'
  );
  console.error(
    '  --bucket <name>          Cloud Storageバケット名を指定（--delete時は必須）'
  );
  console.error('  --project <project-id>   Firebaseプロジェクトを指定');
}

interface CliArgs {
  searchTerm: string;
  field?: 'ssmlJa' | 'ssmlEn';
  exact: boolean;
  delete: boolean;
  bucket?: string;
  projectId?: string;
}

function parseArgs(argv: string[]): CliArgs | null {
  const args = argv.slice(2);

  if (args.length === 0) {
    return null;
  }

  let searchTerm = '';
  let field: 'ssmlJa' | 'ssmlEn' | undefined;
  let exact = false;
  let deleteMode = false;
  let bucket: string | undefined;
  let projectId: string | undefined;

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
      case '--bucket': {
        const value = args[++i];
        if (!value || value.startsWith('--')) {
          console.error('Error: --bucket には値の指定が必要です');
          process.exit(1);
        }
        bucket = value;
        break;
      }
      case '--project': {
        const value = args[++i];
        if (!value || value.startsWith('--')) {
          console.error('Error: --project には値の指定が必要です');
          process.exit(1);
        }
        projectId = value;
        break;
      }
      default:
        searchTerm = args[i];
        break;
    }
  }

  if (!searchTerm) {
    return null;
  }

  return { searchTerm, field, exact, delete: deleteMode, bucket, projectId };
}

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv);

  if (!cliArgs) {
    printUsage();
    process.exit(1);
  }

  const {
    searchTerm,
    field,
    exact,
    delete: deleteMode,
    bucket,
    projectId,
  } = cliArgs;

  const resolvedProjectId = projectId ?? process.env.GCLOUD_PROJECT;
  if (!resolvedProjectId) {
    console.error(
      'Error: プロジェクトIDが不明です。--project を指定するか GCLOUD_PROJECT 環境変数を設定してください。'
    );
    process.exit(1);
  }

  const app = admin.initializeApp({
    projectId: resolvedProjectId,
    ...(bucket ? { storageBucket: bucket } : {}),
  });
  const firestore = app.firestore();

  const voicesRef = firestore
    .collection('caches')
    .doc('tts')
    .collection('voices');

  console.log(
    `検索中: "${searchTerm}"${field ? ` (${field})` : ''}${exact ? ' [完全一致]' : ''}...\n`
  );

  let results: admin.firestore.QueryDocumentSnapshot[];

  if (exact && field) {
    const snapshot = await voicesRef.where(field, '==', searchTerm).get();
    results = snapshot.docs;
  } else {
    const snapshot = await voicesRef.get();
    results = snapshot.docs.filter((doc) => {
      const data = doc.data();
      const match = (value: string | undefined): boolean => {
        if (!value) return false;
        return exact ? value === searchTerm : value.includes(searchTerm);
      };

      if (field) {
        return match(data[field]);
      }
      return match(data.ssmlJa) || match(data.ssmlEn);
    });
  }

  if (results.length === 0) {
    console.log('一致するドキュメントが見つかりませんでした。');
    return;
  }

  console.log(`${results.length}件のドキュメントが見つかりました:\n`);

  for (const doc of results) {
    const data = doc.data();
    console.log(`ID:         ${doc.id}`);
    console.log(`SSML (JA):  ${data.ssmlJa}`);
    console.log(`SSML (EN):  ${data.ssmlEn}`);
    console.log(`Path (JA):  ${data.pathJa}`);
    console.log(`Path (EN):  ${data.pathEn}`);
    console.log(`Voice (JA): ${data.voiceJa}`);
    console.log(`Voice (EN): ${data.voiceEn}`);
    const createdAt = data.createdAt?.toDate?.()?.toISOString() ?? 'N/A';
    console.log(`Created:    ${createdAt}`);
    console.log('---');
  }

  if (!deleteMode) {
    return;
  }

  if (!bucket) {
    console.error(
      'Error: --delete には --bucket の指定が必要です。'
    );
    process.exit(1);
  }

  const confirmed = await confirm(
    `\n上記 ${results.length}件のドキュメントとストレージのMP3ファイルを削除しますか？ (y/N): `
  );
  if (!confirmed) {
    console.log('削除をキャンセルしました。');
    return;
  }

  const storageBucket = app.storage().bucket();

  for (const doc of results) {
    const data = doc.data();
    const id: string = doc.id;
    const storagePathJa = `caches/tts/ja/${id}.mp3`;
    const storagePathEn = `caches/tts/en/${id}.mp3`;

    console.log(`削除中: ${id}...`);

    const deleteResults = await Promise.allSettled([
      doc.ref.delete(),
      storageBucket.file(storagePathJa).delete(),
      storageBucket.file(storagePathEn).delete(),
    ]);

    const labels = ['Firestore', 'Storage (JA)', 'Storage (EN)'];
    let hasFailure = false;
    for (let i = 0; i < deleteResults.length; i++) {
      const result = deleteResults[i];
      if (result.status === 'rejected') {
        console.warn(`  ${labels[i]} の削除に失敗: ${result.reason}`);
        hasFailure = true;
      }
    }

    if (hasFailure) {
      console.log(`  削除完了（部分失敗）: ${id}`);
    } else {
      console.log(`  削除完了: ${id}`);
    }
  }

  console.log(`\n${results.length}件の削除が完了しました。`);
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

main().catch((err: Error) => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
