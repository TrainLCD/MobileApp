import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import {
  cancelVoicevoxAssetsDownload,
  deleteVoicevoxAssets,
  ensureVoicevoxAssets,
  fileUriToPath,
  getInstalledVoicevoxAssets,
  getVoicevoxAssetsStatus,
  hasVoicevoxDownloadConsent,
  requestVoicevoxAssetsDownload,
  resetVoicevoxAssetsStateForTest,
  subscribeVoicevoxAssets,
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
jest.mock('~/utils/native/ios/voicevoxTtsModule', () => ({
  getVoicevoxTtsModule: () =>
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
  getVoicevoxTTSManifestUrl: () => mockManifestUrl,
  isVoicevoxTTSEnabled: () => mockEnabled,
}));

const mockFetch = jest.fn();
jest.mock('expo/fetch', () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

const manifest = {
  schemaVersion: 1,
  version: 'v1',
  openJtalkDicDir: 'dic',
  voiceModels: ['6.vvm'],
  files: [
    {
      path: 'dic/sys.dic',
      url: 'https://assets.example.com/dic/sys.dic',
      sha256: 'a'.repeat(64),
      bytes: 100,
    },
    {
      path: '6.vvm',
      url: 'https://assets.example.com/6.vvm',
      sha256: 'b'.repeat(64),
      bytes: 50,
    },
  ],
};

const expectedSha: Record<string, string> = {
  'file:///docs/voicevox/v1/dic/sys.dic': 'a'.repeat(64),
  'file:///docs/voicevox/v1/6.vvm': 'b'.repeat(64),
};

const mockManifestResponse = (body: unknown, ok = true) => {
  mockFetch.mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  });
};

describe('voicevox/assets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFiles.clear();
    storage.remove(STORAGE_KEYS.VOICEVOX_ASSETS);
    // 既定は同意済みとして、取得の流れ自体を検証する。同意ゲートは個別に検証する
    storage.set(STORAGE_KEYS.VOICEVOX_DOWNLOAD_CONSENTED, 'true');
    resetVoicevoxAssetsStateForTest();
    mockModuleAvailable = true;
    mockEnabled = true;
    mockManifestUrl = 'https://cfg.example.com/manifest.json';
    // ダウンロードは宛先にマニフェストどおりのサイズのファイルを作る
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

  it('fileUriToPath は file:// を外してデコードする', () => {
    expect(fileUriToPath('file:///docs/voicevox/v1/6.vvm')).toBe(
      '/docs/voicevox/v1/6.vvm'
    );
    expect(fileUriToPath('file:///docs/%E9%9F%B3%E5%A3%B0/6.vvm')).toBe(
      '/docs/音声/6.vvm'
    );
  });

  it('マニフェストどおりに取得・検証して記録し、パスを返す', async () => {
    mockManifestResponse(manifest);

    const result = await ensureVoicevoxAssets();

    expect(result).toEqual({
      version: 'v1',
      openJtalkDicDir: '/docs/voicevox/v1/dic',
      voiceModelPaths: ['/docs/voicevox/v1/6.vvm'],
      totalBytes: 150,
    });
    expect(mockDownload).toHaveBeenCalledTimes(2);
    expect(mockSha256).toHaveBeenCalledWith('/docs/voicevox/v1/dic/sys.dic');
    expect(mockSetExcludedFromBackup).toHaveBeenCalledWith('/docs/voicevox');
    expect(
      JSON.parse(storage.getString(STORAGE_KEYS.VOICEVOX_ASSETS) ?? 'null')
    ).toMatchObject({ version: 'v1', voiceModels: ['6.vvm'] });
    // 取得済みは同期的にも参照できる
    expect(getInstalledVoicevoxAssets()).toEqual(result);
  });

  it('検証済みのファイルは再ダウンロードしない', async () => {
    mockFiles.set('file:///docs/voicevox/v1/dic/sys.dic', 100);
    mockFiles.set('file:///docs/voicevox/v1/6.vvm', 50);
    mockManifestResponse(manifest);

    await ensureVoicevoxAssets();

    expect(mockDownload).not.toHaveBeenCalled();
    expect(mockSha256).toHaveBeenCalledTimes(2);
  });

  it('ハッシュが合わないダウンロードは削除して失敗にする', async () => {
    mockSha256.mockResolvedValue('0'.repeat(64));
    mockManifestResponse(manifest);

    const result = await ensureVoicevoxAssets();

    expect(result).toBeNull();
    expect(mockFiles.has('file:///docs/voicevox/v1/dic/sys.dic')).toBe(false);
    expect(storage.getString(STORAGE_KEYS.VOICEVOX_ASSETS)).toBeUndefined();
  });

  it('記録があればファイルの存在とサイズだけで復元し、再ハッシュしない', async () => {
    mockManifestResponse(manifest);
    await ensureVoicevoxAssets();
    resetVoicevoxAssetsStateForTest();
    mockSha256.mockClear();

    expect(getInstalledVoicevoxAssets()).toEqual({
      version: 'v1',
      openJtalkDicDir: '/docs/voicevox/v1/dic',
      voiceModelPaths: ['/docs/voicevox/v1/6.vvm'],
      totalBytes: 150,
    });
    expect(mockSha256).not.toHaveBeenCalled();
  });

  it('記録どおりのファイルが欠けていれば未取得として扱う', async () => {
    mockManifestResponse(manifest);
    await ensureVoicevoxAssets();
    resetVoicevoxAssetsStateForTest();
    mockFiles.delete('file:///docs/voicevox/v1/6.vvm');

    expect(getInstalledVoicevoxAssets()).toBeNull();
  });

  it('バージョンが変わったら取り直し、旧バージョンを削除する', async () => {
    mockManifestResponse(manifest);
    await ensureVoicevoxAssets();
    expect(mockFiles.has('file:///docs/voicevox/v1/6.vvm')).toBe(true);

    const next = {
      ...manifest,
      version: 'v2',
      files: manifest.files.map((f) => ({
        ...f,
        url: f.url.replace('example.com', 'example.com/v2'),
      })),
    };
    mockDownload.mockImplementation(
      async (url: string, destination: { uri: string }) => {
        const entry = next.files.find((f) => f.url === url);
        mockFiles.set(destination.uri, entry?.bytes ?? 0);
        return destination;
      }
    );
    mockSha256.mockImplementation(
      async (path: string) =>
        expectedSha[`file://${path.replace('/v2/', '/v1/')}`] ?? ''
    );
    mockManifestResponse(next);

    const result = await ensureVoicevoxAssets();

    expect(result?.version).toBe('v2');
    expect(mockFiles.has('file:///docs/voicevox/v2/6.vvm')).toBe(true);
    expect(mockFiles.has('file:///docs/voicevox/v1/6.vvm')).toBe(false);
  });

  it('同時に呼ばれても取得は 1 本にまとめる', async () => {
    mockManifestResponse(manifest);

    const [a, b] = await Promise.all([
      ensureVoicevoxAssets(),
      ensureVoicevoxAssets(),
    ]);

    expect(a).toEqual(b);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('マニフェスト取得に失敗した直後は再試行しない', async () => {
    mockManifestResponse({}, false);
    expect(await ensureVoicevoxAssets()).toBeNull();

    expect(await ensureVoicevoxAssets()).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('ネイティブモジュールが無い構成 (App Clip・Android) では何もしない', async () => {
    mockModuleAvailable = false;
    expect(await ensureVoicevoxAssets()).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('配信 URL が未設定なら何もしない', async () => {
    mockManifestUrl = null;
    expect(await ensureVoicevoxAssets()).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('不正なマニフェストは弾いて null を返す', async () => {
    mockManifestResponse({ ...manifest, files: [] });
    expect(await ensureVoicevoxAssets()).toBeNull();
    expect(mockDownload).not.toHaveBeenCalled();
  });
  describe('同意ゲート', () => {
    it('未同意なら ensureVoicevoxAssets は何もしない', async () => {
      storage.remove(STORAGE_KEYS.VOICEVOX_DOWNLOAD_CONSENTED);

      expect(await ensureVoicevoxAssets()).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(getVoicevoxAssetsStatus().phase).toBe('not_downloaded');
    });

    it('requestVoicevoxAssetsDownload は同意を記録して直ちに取得する', async () => {
      storage.remove(STORAGE_KEYS.VOICEVOX_DOWNLOAD_CONSENTED);
      mockManifestResponse(manifest);

      const result = await requestVoicevoxAssetsDownload();

      expect(result?.version).toBe('v1');
      expect(hasVoicevoxDownloadConsent()).toBe(true);
    });

    it('失敗直後でも requestVoicevoxAssetsDownload は待機せず再試行する', async () => {
      mockManifestResponse({}, false);
      expect(await ensureVoicevoxAssets()).toBeNull();
      expect(getVoicevoxAssetsStatus()).toMatchObject({
        phase: 'error',
        errorMessage: 'manifest fetch failed: 500',
      });

      mockManifestResponse(manifest);
      expect((await requestVoicevoxAssetsDownload())?.version).toBe('v1');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('Remote Config で無効なら取得しない', async () => {
      mockEnabled = false;
      expect(await ensureVoicevoxAssets()).toBeNull();
      expect(await requestVoicevoxAssetsDownload()).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(getVoicevoxAssetsStatus().phase).toBe('unsupported');
    });
  });

  describe('進捗と状態', () => {
    it('取得中はファイルごとの進捗を合計バイト数に対して通知する', async () => {
      const seen: Array<[string, number, number]> = [];
      subscribeVoicevoxAssets(() => {
        const status = getVoicevoxAssetsStatus();
        seen.push([status.phase, status.downloadedBytes, status.totalBytes]);
      });
      mockDownload.mockImplementation(
        async (
          url: string,
          destination: { uri: string },
          options: { onProgress: (p: { bytesWritten: number }) => void }
        ) => {
          const entry = manifest.files.find((f) => f.url === url);
          options.onProgress({
            bytesWritten: Math.floor((entry?.bytes ?? 0) / 2),
          });
          mockFiles.set(destination.uri, entry?.bytes ?? 0);
          return destination;
        }
      );
      mockManifestResponse(manifest);

      await ensureVoicevoxAssets();

      expect(seen).toEqual(
        expect.arrayContaining([
          ['downloading', 0, 150],
          ['downloading', 50, 150],
          ['downloading', 100, 150],
          ['downloading', 125, 150],
          ['downloading', 150, 150],
          ['installed', 150, 150],
        ])
      );
      expect(getVoicevoxAssetsStatus()).toMatchObject({
        phase: 'installed',
        version: 'v1',
        totalBytes: 150,
      });
    });

    it('検証済みで飛ばしたファイルも進捗に含める', async () => {
      mockFiles.set('file:///docs/voicevox/v1/dic/sys.dic', 100);
      const seen: number[] = [];
      subscribeVoicevoxAssets(() => {
        seen.push(getVoicevoxAssetsStatus().downloadedBytes);
      });
      mockManifestResponse(manifest);

      await ensureVoicevoxAssets();

      expect(seen).toContain(100);
      expect(mockDownload).toHaveBeenCalledTimes(1);
    });

    it('状態が変わらない限り同じスナップショットを返す', () => {
      const a = getVoicevoxAssetsStatus();
      const b = getVoicevoxAssetsStatus();
      expect(a).toBe(b);
      expect(a.phase).toBe('not_downloaded');
    });
  });

  describe('キャンセルと削除', () => {
    it('キャンセルすると取得を中断し同意を取り消す', async () => {
      let abortSignal: AbortSignal | null = null;
      mockDownload.mockImplementation(
        (
          _url: string,
          _destination: { uri: string },
          options: { signal: AbortSignal }
        ) =>
          new Promise((_resolve, reject) => {
            abortSignal = options.signal;
            options.signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError'))
            );
          })
      );
      mockManifestResponse(manifest);

      const pending = ensureVoicevoxAssets();
      // マニフェスト取得と最初のダウンロード開始まで進める
      for (let i = 0; i < 10; i += 1) {
        await Promise.resolve();
      }
      expect(getVoicevoxAssetsStatus().phase).toBe('downloading');
      expect(abortSignal).not.toBeNull();

      cancelVoicevoxAssetsDownload();
      expect(await pending).toBeNull();

      expect(hasVoicevoxDownloadConsent()).toBe(false);
      expect(getVoicevoxAssetsStatus()).toMatchObject({
        phase: 'not_downloaded',
        errorMessage: null,
      });
    });

    it('キャンセル直後の再要求は、中断した取得が片付いてから取り直す', async () => {
      let rejectDownload: ((e: unknown) => void) | null = null;
      mockDownload.mockImplementationOnce(
        (
          _url: string,
          _destination: { uri: string },
          options: { signal: AbortSignal }
        ) =>
          new Promise((_resolve, reject) => {
            rejectDownload = reject;
            options.signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError'))
            );
          })
      );
      mockManifestResponse(manifest);
      const first = ensureVoicevoxAssets();
      for (let i = 0; i < 10; i += 1) {
        await Promise.resolve();
      }
      expect(getVoicevoxAssetsStatus().phase).toBe('downloading');

      cancelVoicevoxAssetsDownload();
      // 中断が片付く前に「ダウンロード」を押し直した
      mockManifestResponse(manifest);
      const second = requestVoicevoxAssetsDownload();
      expect(rejectDownload).not.toBeNull();

      expect(await first).toBeNull();
      expect((await second)?.version).toBe('v1');
      expect(hasVoicevoxDownloadConsent()).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(getVoicevoxAssetsStatus().phase).toBe('installed');
    });

    it('削除すると合成器を解放し、ファイルと記録と同意を消す', async () => {
      mockManifestResponse(manifest);
      await ensureVoicevoxAssets();
      expect(getVoicevoxAssetsStatus().phase).toBe('installed');

      await deleteVoicevoxAssets();

      expect(mockRelease).toHaveBeenCalledTimes(1);
      expect(mockFiles.size).toBe(0);
      expect(storage.getString(STORAGE_KEYS.VOICEVOX_ASSETS)).toBeUndefined();
      expect(hasVoicevoxDownloadConsent()).toBe(false);
      expect(getInstalledVoicevoxAssets()).toBeNull();
      expect(getVoicevoxAssetsStatus().phase).toBe('not_downloaded');
    });
  });
});
