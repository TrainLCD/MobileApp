import { fetch } from 'expo/fetch';
import { Directory, File, Paths } from 'expo-file-system';
import { STORAGE_KEYS } from '~/constants/storage';
import {
  VITS_ASSET_DIR_NAME,
  VITS_ASSET_RETRY_INTERVAL_MS,
  VITS_MANIFEST_FETCH_TIMEOUT_MS,
} from '~/constants/vits';
import type { ManifestFile } from '~/lib/assetManifestSchema';
import { getVitsTTSManifestUrl, isVitsTTSEnabled } from '~/lib/remoteConfig';
import { storage } from '~/lib/storage';
import { getVitsTtsModule } from '~/utils/native/ios/vitsTtsModule';
import { parseVitsManifest, type VitsManifest } from './manifest';

// VITS の英語音声モデル (ONNX) と発音辞書を端末へ取得・検証して保持する。
// 日本語 (src/lib/voicevox/assets.ts) と同じ手順・同じ制約で動くが、同意も記録も
// 別枠にしてあり、片方だけ取得した状態で構わない。
//
// - 置き場は Paths.document/vits/<version>/ 。cache はストレージ逼迫時に OS が
//   消しうるため使わない。iCloud バックアップからはネイティブ側で除外する。
// - マニフェスト (src/lib/vits/manifest.ts) の version が変わったら新しい
//   ディレクトリへ取り直し、完了後に旧バージョンを削除する。
// - 各ファイルはサイズと SHA-256 で検証する。ハッシュは 100MB 超のモデルを JS へ
//   読み込まずに済むようネイティブ (CryptoKit) で計算する。
// - 検証済みの状態は MMKV (VITS_ASSETS) に記録し、次回起動以降はファイルの存在と
//   サイズだけを確認して再ハッシュしない。
// - 約 118MB の取得はユーザーの同意 (VITS_DOWNLOAD_CONSENTED) を得てから始める。
// - 取得は同時に 1 本だけ走らせ、失敗後は一定時間再試行しない。
// - 進捗と状態は subscribeVitsAssets / getVitsAssetsStatus で購読できる。

// ネイティブモジュールへ渡す、取得済み資産の絶対パス (file:// を除いたもの)
export interface VitsInstalledAssets {
  version: string;
  modelPath: string;
  tokensPath: string;
  lexiconPath: string;
  // 資産一式の合計バイト数 (設定画面の表示用)
  totalBytes: number;
}

// 取得の進行状況。設定画面はこれを購読して表示する。
export type VitsAssetsPhase =
  // ネイティブモジュールが無い (App Clip / Android)・Remote Config で無効・配信 URL 未設定
  'unsupported' | 'not_downloaded' | 'downloading' | 'installed' | 'error';

export interface VitsAssetsStatus {
  phase: VitsAssetsPhase;
  downloadedBytes: number;
  totalBytes: number;
  version: string | null;
  errorMessage: string | null;
}

// MMKV へ保存する検証済み状態
interface InstalledRecord {
  version: string;
  model: string;
  tokens: string;
  lexicon: string;
  files: Array<{ path: string; bytes: number }>;
}

interface DownloadProgressState {
  downloadedBytes: number;
  totalBytes: number;
}

let installedCache: VitsInstalledAssets | null = null;
let inFlight: Promise<VitsInstalledAssets | null> | null = null;
let lastFailureAt = 0;
let lastErrorMessage: string | null = null;
let progress: DownloadProgressState | null = null;
let abortController: AbortController | null = null;

const listeners = new Set<() => void>();
let statusSnapshot: VitsAssetsStatus | null = null;

const notify = (): void => {
  // 次の getVitsAssetsStatus で作り直させる
  statusSnapshot = null;
  for (const listener of listeners) {
    listener();
  }
};

/**
 * 状態変化の購読 (useSyncExternalStore 互換)。Remote Config の変化は含まないので、
 * 表示側は subscribeRemoteConfig も合わせて購読する
 */
export const subscribeVitsAssets = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * テスト用。モジュール内の状態を初期化する
 */
export const resetVitsAssetsStateForTest = (): void => {
  installedCache = null;
  inFlight = null;
  lastFailureAt = 0;
  lastErrorMessage = null;
  progress = null;
  abortController = null;
  statusSnapshot = null;
  listeners.clear();
};

/**
 * expo-file-system の file:// URI をネイティブ API に渡せるパスへ変換する
 */
export const fileUriToPath = (uri: string): string =>
  decodeURIComponent(uri.replace(/^file:\/\//, ''));

const rootDirectory = (): Directory =>
  new Directory(Paths.document, VITS_ASSET_DIR_NAME);

const versionDirectory = (version: string): Directory =>
  new Directory(rootDirectory(), version);

const fileFor = (dir: Directory, relativePath: string): File =>
  new File(dir, ...relativePath.split('/'));

const isSupported = (): boolean =>
  getVitsTtsModule() !== null &&
  isVitsTTSEnabled() &&
  getVitsTTSManifestUrl() !== null;

/**
 * ユーザーが取得に同意済みか。同意はダウンロードのキャンセルか資産の削除で取り消す
 */
export const hasVitsDownloadConsent = (): boolean =>
  storage.getString(STORAGE_KEYS.VITS_DOWNLOAD_CONSENTED) === 'true';

const setDownloadConsent = (consented: boolean): void => {
  if (consented) {
    storage.set(STORAGE_KEYS.VITS_DOWNLOAD_CONSENTED, 'true');
  } else {
    storage.remove(STORAGE_KEYS.VITS_DOWNLOAD_CONSENTED);
  }
};

const readInstalledRecord = (): InstalledRecord | null => {
  const raw = storage.getString(STORAGE_KEYS.VITS_ASSETS);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<InstalledRecord>;
    if (
      typeof parsed.version !== 'string' ||
      typeof parsed.model !== 'string' ||
      typeof parsed.tokens !== 'string' ||
      typeof parsed.lexicon !== 'string' ||
      !Array.isArray(parsed.files)
    ) {
      return null;
    }
    return parsed as InstalledRecord;
  } catch {
    return null;
  }
};

const toInstalledAssets = (record: InstalledRecord): VitsInstalledAssets => {
  const dir = versionDirectory(record.version);
  return {
    version: record.version,
    modelPath: fileUriToPath(fileFor(dir, record.model).uri),
    tokensPath: fileUriToPath(fileFor(dir, record.tokens).uri),
    lexiconPath: fileUriToPath(fileFor(dir, record.lexicon).uri),
    totalBytes: record.files.reduce((sum, file) => sum + file.bytes, 0),
  };
};

// 記録どおりのファイルがサイズ込みで揃っているか (再ハッシュはしない)
const isRecordIntact = (record: InstalledRecord): boolean => {
  const dir = versionDirectory(record.version);
  return record.files.every((entry) => {
    const file = fileFor(dir, entry.path);
    return file.exists && file.size === entry.bytes;
  });
};

/**
 * 取得・検証済みの資産を同期的に返す。未取得なら null。
 * 起動後の初回呼び出しでは MMKV の記録とファイルの存在を突き合わせる。
 */
export const getInstalledVitsAssets = (): VitsInstalledAssets | null => {
  if (installedCache) {
    return installedCache;
  }
  const record = readInstalledRecord();
  if (!record) {
    return null;
  }
  try {
    if (!isRecordIntact(record)) {
      return null;
    }
  } catch (e) {
    console.warn('[vits/assets] failed to inspect installed assets:', e);
    return null;
  }
  installedCache = toInstalledAssets(record);
  return installedCache;
};

/**
 * 表示用の状態を同期的に返す。値が変わらない限り同じオブジェクトを返すので
 * useSyncExternalStore の getSnapshot に渡せる。
 */
export const getVitsAssetsStatus = (): VitsAssetsStatus => {
  const installed = getInstalledVitsAssets();
  let next: VitsAssetsStatus;
  if (!isSupported()) {
    next = {
      phase: 'unsupported',
      downloadedBytes: 0,
      totalBytes: 0,
      version: null,
      errorMessage: null,
    };
  } else if (progress) {
    next = {
      phase: 'downloading',
      downloadedBytes: progress.downloadedBytes,
      totalBytes: progress.totalBytes,
      version: installed?.version ?? null,
      errorMessage: null,
    };
  } else if (lastErrorMessage) {
    next = {
      phase: 'error',
      downloadedBytes: 0,
      totalBytes: 0,
      version: installed?.version ?? null,
      errorMessage: lastErrorMessage,
    };
  } else if (installed) {
    next = {
      phase: 'installed',
      downloadedBytes: installed.totalBytes,
      totalBytes: installed.totalBytes,
      version: installed.version,
      errorMessage: null,
    };
  } else {
    next = {
      phase: 'not_downloaded',
      downloadedBytes: 0,
      totalBytes: 0,
      version: null,
      errorMessage: null,
    };
  }

  const prev = statusSnapshot;
  if (
    prev &&
    prev.phase === next.phase &&
    prev.downloadedBytes === next.downloadedBytes &&
    prev.totalBytes === next.totalBytes &&
    prev.version === next.version &&
    prev.errorMessage === next.errorMessage
  ) {
    return prev;
  }
  statusSnapshot = next;
  return next;
};

const fetchManifest = async (
  url: string,
  signal: AbortSignal
): Promise<VitsManifest> => {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener('abort', onAbort);
  const timeoutId = setTimeout(
    () => controller.abort(),
    VITS_MANIFEST_FETCH_TIMEOUT_MS
  );
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`manifest fetch failed: ${response.status}`);
    }
    return parseVitsManifest(await response.json());
  } finally {
    clearTimeout(timeoutId);
    signal.removeEventListener('abort', onAbort);
  }
};

const verifyFile = async (
  file: File,
  expected: ManifestFile,
  sha256: (path: string) => Promise<string>
): Promise<boolean> => {
  if (!file.exists || file.size !== expected.bytes) {
    return false;
  }
  const digest = await sha256(fileUriToPath(file.uri));
  return digest.toLowerCase() === expected.sha256;
};

const installFile = async (
  dir: Directory,
  entry: ManifestFile,
  sha256: (path: string) => Promise<string>,
  signal: AbortSignal,
  onProgress: (bytesWritten: number) => void
): Promise<void> => {
  const file = fileFor(dir, entry.path);
  if (await verifyFile(file, entry, sha256)) {
    onProgress(entry.bytes);
    return;
  }
  file.parentDirectory.create({ intermediates: true, idempotent: true });
  if (file.exists) {
    file.delete();
  }
  await File.downloadFileAsync(entry.url, file, {
    idempotent: true,
    signal,
    onProgress: ({ bytesWritten }) => {
      // Content-Length が無い場合も bytesWritten は進む。マニフェストのサイズを
      // 上限にして、サーバー側の計上違いで 100% を超えないようにする
      onProgress(Math.min(bytesWritten, entry.bytes));
    },
  });
  if (!(await verifyFile(file, entry, sha256))) {
    // 壊れたファイルを残すと次回の存在チェックをすり抜けるため必ず消す
    try {
      file.delete();
    } catch {}
    throw new Error(`downloaded file failed verification: ${entry.path}`);
  }
  onProgress(entry.bytes);
};

// 現行バージョン以外のディレクトリを削除する。失敗しても取得結果には影響させない
const pruneOtherVersions = (currentVersion: string): void => {
  const root = rootDirectory();
  if (!root.exists) {
    return;
  }
  for (const item of root.list()) {
    if (item instanceof Directory && item.name !== currentVersion) {
      try {
        item.delete();
      } catch (e) {
        console.warn('[vits/assets] failed to prune old assets:', e);
      }
    }
  }
};

const installFromManifest = async (
  manifest: VitsManifest,
  signal: AbortSignal
): Promise<VitsInstalledAssets> => {
  const module = getVitsTtsModule();
  if (!module) {
    throw new Error('VITS native module is unavailable');
  }
  const sha256 = (path: string) => module.sha256(path);

  const root = rootDirectory();
  root.create({ intermediates: true, idempotent: true });
  const dir = versionDirectory(manifest.version);
  dir.create({ intermediates: true, idempotent: true });

  const totalBytes = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
  let completedBytes = 0;
  let lastNotifiedBytes = 0;
  // onProgress は 1 秒に何度も届く。設定画面を無駄に再描画しないよう、
  // 全体の 0.5% 進むか完了したときだけ通知する
  const notifyThreshold = totalBytes / 200;
  progress = { downloadedBytes: 0, totalBytes };
  notify();

  // モデルと辞書を順に取得する。並列にしても回線が律速で、途中で失敗したときに
  // 揃わない中間状態が増えるだけなので直列で進める。
  for (const entry of manifest.files) {
    if (signal.aborted) {
      throw new DOMException('download cancelled', 'AbortError');
    }
    await installFile(dir, entry, sha256, signal, (bytesWritten) => {
      const downloadedBytes = Math.min(
        completedBytes + bytesWritten,
        totalBytes
      );
      progress = { downloadedBytes, totalBytes };
      if (
        downloadedBytes - lastNotifiedBytes >= notifyThreshold ||
        downloadedBytes === totalBytes
      ) {
        lastNotifiedBytes = downloadedBytes;
        notify();
      }
    });
    completedBytes += entry.bytes;
  }

  try {
    await module.setExcludedFromBackup(fileUriToPath(root.uri));
  } catch (e) {
    console.warn('[vits/assets] failed to exclude from backup:', e);
  }

  const record: InstalledRecord = {
    version: manifest.version,
    model: manifest.model,
    tokens: manifest.tokens,
    lexicon: manifest.lexicon,
    files: manifest.files.map(({ path, bytes }) => ({ path, bytes })),
  };
  storage.set(STORAGE_KEYS.VITS_ASSETS, JSON.stringify(record));
  pruneOtherVersions(manifest.version);

  installedCache = toInstalledAssets(record);
  return installedCache;
};

const isAbortError = (e: unknown): boolean =>
  e instanceof Error && e.name === 'AbortError';

const runEnsure = (
  manifestUrl: string
): Promise<VitsInstalledAssets | null> => {
  const controller = new AbortController();
  abortController = controller;
  lastErrorMessage = null;
  notify();

  const task = (async () => {
    try {
      const manifest = await fetchManifest(manifestUrl, controller.signal);
      const installed = getInstalledVitsAssets();
      if (installed && installed.version === manifest.version) {
        return installed;
      }
      const result = await installFromManifest(manifest, controller.signal);
      console.warn(
        `[vits/assets] installed version ${result.version} (${manifest.files.length} files)`
      );
      return result;
    } catch (e) {
      if (isAbortError(e) || controller.signal.aborted) {
        // ユーザーのキャンセル。エラーではなく未取得へ戻す
        return getInstalledVitsAssets();
      }
      lastFailureAt = Date.now();
      lastErrorMessage = e instanceof Error ? e.message : String(e);
      console.warn('[vits/assets] failed to prepare assets:', e);
      // 取得に失敗しても、既に揃っている旧バージョンがあればそれを使い続ける
      return getInstalledVitsAssets();
    } finally {
      progress = null;
      if (abortController === controller) {
        abortController = null;
      }
      inFlight = null;
      notify();
    }
  })();
  inFlight = task;
  return task;
};

/**
 * 同意済みなら、マニフェストを取得して資産が揃っていなければダウンロード・検証する。
 * 揃った資産のパスを返す。VITS が使えない構成 (ネイティブモジュール無し・無効・
 * 配信 URL 未設定)、未同意、取得失敗時は取得済みの資産 (無ければ null)。
 * 同時に複数回呼ばれても取得は 1 本にまとめ、失敗直後の再試行は間隔を空ける。
 */
export const ensureVitsAssets = (): Promise<VitsInstalledAssets | null> => {
  if (inFlight) {
    return inFlight;
  }
  const manifestUrl = getVitsTTSManifestUrl();
  if (!isSupported() || !manifestUrl || !hasVitsDownloadConsent()) {
    return Promise.resolve(getInstalledVitsAssets());
  }
  if (Date.now() - lastFailureAt < VITS_ASSET_RETRY_INTERVAL_MS) {
    return Promise.resolve(getInstalledVitsAssets());
  }
  return runEnsure(manifestUrl);
};

/**
 * ユーザーの明示的な操作で取得を始める (同意ダイアログの「ダウンロード」や
 * 設定画面の再試行)。同意を記録し、失敗後の待機時間を無視して直ちに取得する。
 */
export const requestVitsAssetsDownload =
  (): Promise<VitsInstalledAssets | null> => {
    const manifestUrl = getVitsTTSManifestUrl();
    if (!isSupported() || !manifestUrl) {
      return Promise.resolve(getInstalledVitsAssets());
    }
    setDownloadConsent(true);
    lastFailureAt = 0;
    const current = inFlight;
    if (current) {
      if (!abortController?.signal.aborted) {
        return current;
      }
      // キャンセル直後で中断中の取得が片付くのを待ち、その間に再びキャンセルされて
      // いなければ取り直す (中断した取得は再開されないため)
      return current.then(() =>
        hasVitsDownloadConsent() ? ensureVitsAssets() : getInstalledVitsAssets()
      );
    }
    return runEnsure(manifestUrl);
  };

/**
 * 進行中の取得を中断し、同意も取り消す (次回起動時に勝手に再開しない)。
 * 取得済みのファイルは残すので、再度ダウンロードすると続きから進む。
 */
export const cancelVitsAssetsDownload = (): void => {
  setDownloadConsent(false);
  abortController?.abort();
};

/**
 * 取得済みの資産を削除して同意も取り消す。合成器がモデルを開いたままだと
 * 削除に失敗しうるため、先にネイティブ側を解放する。
 */
export const deleteVitsAssets = async (): Promise<void> => {
  cancelVitsAssetsDownload();
  if (inFlight) {
    await inFlight;
  }
  try {
    await getVitsTtsModule()?.release();
  } catch (e) {
    console.warn('[vits/assets] failed to release synthesizer:', e);
  }
  storage.remove(STORAGE_KEYS.VITS_ASSETS);
  installedCache = null;
  lastErrorMessage = null;
  const root = rootDirectory();
  try {
    if (root.exists) {
      root.delete();
    }
  } catch (e) {
    console.warn('[vits/assets] failed to delete assets:', e);
  }
  notify();
};
