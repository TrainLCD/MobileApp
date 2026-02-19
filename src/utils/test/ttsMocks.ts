export const mockFetch = jest.fn();

jest.mock('expo/fetch', () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

jest.mock('expo-file-system', () => ({
  Paths: { cache: '/tmp' },
  File: class {
    public uri: string;

    constructor(basePath: string, name: string) {
      this.uri = `${basePath}/${name}`;
    }

    write() {}
  },
}));
