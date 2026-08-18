export const mockFetch = jest.fn();

// 退避・クリア時に削除された音声ファイルの uri を受け取る。
// jest.mock のファクトリから参照するため、名前は `mock` 始まりにする必要がある。
export const mockFileDelete = jest.fn();

jest.mock('expo/fetch', () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

jest.mock('expo-file-system', () => ({
  Paths: { cache: '/tmp' },
  File: class {
    public uri: string;

    // `new File(basePath, name)` と `new File(uri)` の両方の呼ばれ方をする
    constructor(basePathOrUri: string, name?: string) {
      this.uri =
        name === undefined ? basePathOrUri : `${basePathOrUri}/${name}`;
    }

    write() {}

    delete() {
      mockFileDelete(this.uri);
    }
  },
}));
