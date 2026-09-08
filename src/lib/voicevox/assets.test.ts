import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import {
  ensureVoicevoxAssets,
  fileUriToPath,
  getInstalledVoicevoxAssets,
  resetVoicevoxAssetsStateForTest,
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
      return true;
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
    static downloadFileAsync = (url: string, destination: MockFile) =>
      mockDownload(url, destination);
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
let mockModuleAvailable = true;
jest.mock('~/utils/native/ios/voicevoxTtsModule', () => ({
  getVoicevoxTtsModule: () =>
    mockModuleAvailable
      ? {
          sha256: (path: string) => mockSha256(path),
          setExcludedFromBackup: (path: string) =>
            mockSetExcludedFromBackup(path),
        }
      : null,
}));

// --- Remote Config / fetch ----------------------------------------------------
let mockManifestUrl: string | null = 'https://cfg.example.com/manifest.json';
jest.mock('~/lib/remoteConfig', () => ({
  getVoicevoxTTSManifestUrl: () => mockManifestUrl,
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
    resetVoicevoxAssetsStateForTest();
    mockModuleAvailable = true;
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
});
