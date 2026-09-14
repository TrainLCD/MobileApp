import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import {
  cancelVitsAssetsDownload,
  deleteVitsAssets,
  ensureVitsAssets,
  fileUriToPath,
  getInstalledVitsAssets,
  getVitsAssetsStatus,
  hasVitsDownloadConsent,
  requestVitsAssetsDownload,
  resetVitsAssetsStateForTest,
} from './assets';

// --- expo-file-system をインメモリで模倣する -------------------------------
// 実ファイルは触らず、「存在するファイルとそのサイズ」だけを Map で管理する。
const mockFiles = new Map<string, number>();
const mockDownload = jest.fn();

jest.mock('expo-file-system', () => {
  class MockDirectory {
    public uri: string;
    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts
        .map((p) => (typeof p === 'string' ? p : p.uri))
        .join('/')
        .replace(/\/+/g, '/')
        .replace(/^file:\/+/, 'file:///');
    }
    get name() {
      return this.uri.split('/').filter(Boolean).pop() ?? '';
    }
    get exists() {
      return [...mockFiles.keys()].some((key) =>
        key.startsWith(`${this.uri}/`)
      );
    }
    create() {}
    delete() {
      for (const key of [...mockFiles.keys()]) {
        if (key.startsWith(`${this.uri}/`)) {
          mockFiles.delete(key);
        }
      }
    }
    list() {
      const prefix = `${this.uri}/`;
      const names = new Set<string>();
      for (const key of mockFiles.keys()) {
        if (key.startsWith(prefix)) {
          names.add(key.slice(prefix.length).split('/')[0] ?? '');
        }
      }
      return [...names].map((n) => new MockDirectory(this.uri, n));
    }
  }
  class MockFile {
    public uri: string;
    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts
        .map((p) => (typeof p === 'string' ? p : p.uri))
        .join('/')
        .replace(/\/+/g, '/')
        .replace(/^file:\/+/, 'file:///');
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    get size() {
      return mockFiles.get(this.uri) ?? null;
    }
    get parentDirectory() {
      return new MockDirectory(this.uri.slice(0, this.uri.lastIndexOf('/')));
    }
    delete() {
      mockFiles.delete(this.uri);
    }
    static downloadFileAsync = (
      url: string,
      destination: MockFile,
      options?: unknown
    ) => mockDownload(url, destination, options);
  }
  return {
    Paths: { document: new MockDirectory('file:///docs') },
    Directory: MockDirectory,
    File: MockFile,
  };
});

// --- ネイティブモジュール ------------------------------------------------------
const mockSha256 = jest.fn();
const mockSetExcludedFromBackup = jest.fn();
const mockRelease = jest.fn(async () => undefined);
let mockModuleAvailable = true;
jest.mock('~/utils/native/ios/vitsTtsModule', () => ({
  getVitsTtsModule: () =>
    mockModuleAvailable
      ? {
          sha256: (path: string) => mockSha256(path),
          setExcludedFromBackup: (path: string) =>
            mockSetExcludedFromBackup(path),
          release: () => mockRelease(),
        }
      : null,
}));

// --- Remote Config / fetch ----------------------------------------------------
let mockManifestUrl: string | null = 'https://cfg.example.com/manifest.json';
let mockEnabled = true;
jest.mock('~/lib/remoteConfig', () => ({
  getVitsTTSManifestUrl: () => mockManifestUrl,
  isVitsTTSEnabled: () => mockEnabled,
}));

const mockFetch = jest.fn();
jest.mock('expo/fetch', () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

const manifest = {
  schemaVersion: 1,
  version: 'v1',
  model: 'vits-ljs.onnx',
  tokens: 'tokens.txt',
  lexicon: 'lexicon.txt',
  files: [
    {
      path: 'vits-ljs.onnx',
      url: 'https://assets.example.com/vits-ljs.onnx',
      sha256: 'a'.repeat(64),
      bytes: 100,
    },
    {
      path: 'tokens.txt',
      url: 'https://assets.example.com/tokens.txt',
      sha256: 'b'.repeat(64),
      bytes: 10,
    },
    {
      path: 'lexicon.txt',
      url: 'https://assets.example.com/lexicon.txt',
      sha256: 'c'.repeat(64),
      bytes: 50,
    },
  ],
};

const expectedSha: Record<string, string> = {
  'file:///docs/vits/v1/vits-ljs.onnx': 'a'.repeat(64),
  'file:///docs/vits/v1/tokens.txt': 'b'.repeat(64),
  'file:///docs/vits/v1/lexicon.txt': 'c'.repeat(64),
};

const mockManifestResponse = (body: unknown, ok = true) => {
  mockFetch.mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  });
};

describe('vits/assets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFiles.clear();
    storage.remove(STORAGE_KEYS.VITS_ASSETS);
    // 既定は同意済みとして、取得の流れ自体を検証する。同意ゲートは個別に検証する
    storage.set(STORAGE_KEYS.VITS_DOWNLOAD_CONSENTED, 'true');
    resetVitsAssetsStateForTest();
    mockModuleAvailable = true;
    mockEnabled = true;
    mockManifestUrl = 'https://cfg.example.com/manifest.json';
    mockDownload.mockImplementation(
      async (url: string, destination: { uri: string }) => {
        const entry = manifest.files.find((f) => f.url === url);
        mockFiles.set(destination.uri, entry?.bytes ?? 0);
        return destination;
      }
    );
    mockSha256.mockImplementation(
      async (path: string) => expectedSha[`file://${path}`] ?? 'deadbeef'
    );
  });

  it('マニフェストどおりに取得・検証して記録し、パスを返す', async () => {
    mockManifestResponse(manifest);
    const installed = await ensureVitsAssets();

    expect(installed).toEqual({
      version: 'v1',
      modelPath: '/docs/vits/v1/vits-ljs.onnx',
      tokensPath: '/docs/vits/v1/tokens.txt',
      lexiconPath: '/docs/vits/v1/lexicon.txt',
      totalBytes: 160,
    });
    expect(mockDownload).toHaveBeenCalledTimes(3);
    // 再取得できる資産なので iCloud バックアップからは外す
    expect(mockSetExcludedFromBackup).toHaveBeenCalledWith('/docs/vits');
    expect(getVitsAssetsStatus().phase).toBe('installed');
  });

  it('同意していなければ取得しない', async () => {
    storage.remove(STORAGE_KEYS.VITS_DOWNLOAD_CONSENTED);
    const installed = await ensureVitsAssets();

    expect(installed).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(getVitsAssetsStatus().phase).toBe('not_downloaded');
  });

  it('requestVitsAssetsDownload は同意を記録して直ちに取得する', async () => {
    storage.remove(STORAGE_KEYS.VITS_DOWNLOAD_CONSENTED);
    mockManifestResponse(manifest);
    await requestVitsAssetsDownload();

    expect(hasVitsDownloadConsent()).toBe(true);
    expect(mockDownload).toHaveBeenCalledTimes(3);
  });

  it('SHA-256 が合わないファイルは消して失敗させる', async () => {
    mockSha256.mockImplementation(async () => 'f'.repeat(64));
    mockManifestResponse(manifest);
    const installed = await ensureVitsAssets();

    expect(installed).toBeNull();
    // 壊れたファイルを残すと次回の存在チェックをすり抜けてしまう
    expect(mockFiles.size).toBe(0);
    expect(getVitsAssetsStatus().phase).toBe('error');
  });

  it('version が変わったら取り直して旧バージョンを消す', async () => {
    mockManifestResponse(manifest);
    await ensureVitsAssets();
    resetVitsAssetsStateForTest();

    const v2 = {
      ...manifest,
      version: 'v2',
      files: manifest.files.map((f) => ({ ...f })),
    };
    const expectedShaV2: Record<string, string> = {
      'file:///docs/vits/v2/vits-ljs.onnx': 'a'.repeat(64),
      'file:///docs/vits/v2/tokens.txt': 'b'.repeat(64),
      'file:///docs/vits/v2/lexicon.txt': 'c'.repeat(64),
    };
    mockSha256.mockImplementation(
      async (path: string) => expectedShaV2[`file://${path}`] ?? 'deadbeef'
    );
    mockManifestResponse(v2);
    const installed = await ensureVitsAssets();

    expect(installed?.version).toBe('v2');
    expect([...mockFiles.keys()].some((k) => k.includes('/v1/'))).toBe(false);
  });

  it('ネイティブモジュールが無い構成では unsupported', () => {
    mockModuleAvailable = false;
    expect(getVitsAssetsStatus().phase).toBe('unsupported');
  });

  it('配信 URL が未設定なら unsupported', () => {
    mockManifestUrl = null;
    expect(getVitsAssetsStatus().phase).toBe('unsupported');
  });

  it('削除すると合成器を解放し、同意も取り消す', async () => {
    mockManifestResponse(manifest);
    await ensureVitsAssets();

    await deleteVitsAssets();

    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(hasVitsDownloadConsent()).toBe(false);
    expect(getInstalledVitsAssets()).toBeNull();
    expect(mockFiles.size).toBe(0);
  });

  it('キャンセルすると同意を取り消す', () => {
    cancelVitsAssetsDownload();
    expect(hasVitsDownloadConsent()).toBe(false);
  });

  it('日本語 (VOICEVOX) とは別のディレクトリ・別の記録を使う', async () => {
    mockManifestResponse(manifest);
    await ensureVitsAssets();

    expect(storage.getString(STORAGE_KEYS.VITS_ASSETS)).toBeTruthy();
    expect(
      [...mockFiles.keys()].every((k) => k.startsWith('file:///docs/vits/'))
    ).toBe(true);
  });

  it('fileUriToPath は file:// を外してデコードする', () => {
    expect(fileUriToPath('file:///docs/vits/v1/tokens.txt')).toBe(
      '/docs/vits/v1/tokens.txt'
    );
    expect(fileUriToPath('file:///docs/%E9%9F%B3%E5%A3%B0/a.onnx')).toBe(
      '/docs/音声/a.onnx'
    );
  });
});
