import { clearSessionToken, getSessionToken } from './session';

jest.mock('./installId', () => ({
  getInstallId: jest.fn().mockResolvedValue('test-install-id'),
}));

jest.mock('./workerApi', () => ({
  workerUrl: (path: string) => `https://worker.test${path}`,
}));

const fetchMock = jest.fn();
const origFetch = global.fetch;
global.fetch = fetchMock as unknown as typeof fetch;

// 解決タイミングを手動制御できる /auth/token 応答を 1 回分積む
const deferTokenResponse = () => {
  let resolve!: (value: unknown) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    })
  );
  return {
    resolveWith: (token: string) =>
      resolve({
        ok: true,
        status: 200,
        json: async () => ({ token, expiresIn: 3600 }),
      }),
  };
};

const mockTokenResponse = (token: string) => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ token, expiresIn: 3600 }),
  });
};

const mockTokenFailure = () => {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status: 503,
    json: async () => ({}),
  });
};

afterEach(() => {
  jest.clearAllMocks();
  clearSessionToken();
});

afterAll(() => {
  global.fetch = origFetch;
});

describe('getSessionToken', () => {
  it('取得中に並行して呼び出しても /auth/token への POST は 1 回に共有される', async () => {
    const deferred = deferTokenResponse();

    // 先読み(画面マウント)と初回送信が競合するシナリオ
    const first = getSessionToken();
    const second = getSessionToken();
    deferred.resolveWith('token-shared');

    await expect(first).resolves.toBe('token-shared');
    await expect(second).resolves.toBe('token-shared');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('キャッシュが有効な間は再取得しない', async () => {
    mockTokenResponse('token-cached');
    await expect(getSessionToken()).resolves.toBe('token-cached');

    await expect(getSessionToken()).resolves.toBe('token-cached');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('取得失敗(null)は並行呼び出しに共有され、次回の呼び出しで再取得する', async () => {
    mockTokenFailure();
    const first = getSessionToken();
    const second = getSessionToken();
    await expect(first).resolves.toBeNull();
    await expect(second).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 失敗は inflight のクリア後なので、次の呼び出しは新規に取得する
    mockTokenResponse('token-retry');
    await expect(getSessionToken()).resolves.toBe('token-retry');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
