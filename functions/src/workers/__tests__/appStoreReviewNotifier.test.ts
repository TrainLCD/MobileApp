// --- Mocks ---
const gcsStore = new Map<string, string>();

jest.mock('@google-cloud/storage', () => {
  const store = gcsStore;
  class File {
    private key: string;
    constructor(bucketName: string, fileName: string) {
      this.key = `${bucketName}/${fileName}`;
    }
    async download(): Promise<[Buffer]> {
      const v = store.get(this.key) ?? '';
      return [Buffer.from(v)];
    }
    async save(data: string | Buffer) {
      store.set(
        this.key,
        typeof data === 'string' ? data : data.toString('utf8')
      );
    }
  }
  class Bucket {
    constructor(private name: string) {}
    file(fileName: string) {
      return new File(this.name, fileName);
    }
  }
  return {
    Storage: class Storage {
      bucket(name: string) {
        return new Bucket(name);
      }
    },
    __mockGcsStore: store,
  };
});

// Global fetch mock (JSON feed and Discord)
const fetchMock = jest.fn();
const origFetch = global.fetch;
global.fetch = fetchMock as unknown as typeof fetch;

describe('appStoreReviewNotifier (JSON only)', () => {
  beforeEach(() => {
    jest.resetModules();
    gcsStore.clear();
    fetchMock.mockReset();
    prevEnv = { ...process.env };
    process.env.REVIEWS_DEBUG = '1';
    process.env.DISCORD_REVIEW_WEBHOOK_URL = 'https://discord.test/webhook';
    process.env.APPSTORE_REVIEW_FEED_URL = 'https://example.test/rss.json';
    process.env.APPSTORE_REVIEW_STATE_GCS_URI =
      'gs://test-bucket/states/appstore.json';
  });
  let prevEnv: NodeJS.ProcessEnv;
  afterEach(() => {
    process.env = prevEnv;
  });
  afterAll(() => {
    global.fetch = origFetch;
  });

  test('新着レビューのみ通知し、stateを更新する', async () => {
    const feedJson = JSON.stringify({
      feed: {
        entry: [
          {
            id: { label: 'r1' },
            updated: { label: '2025-09-03T10:00:00Z' },
            title: { label: 'Great' },
            content: { label: 'Awesome' },
            'im:rating': { label: '5' },
            'im:version': { label: '1.0' },
            author: { name: { label: 'A' } },
            link: { attributes: { href: 'https://example.com/r1' } },
          },
          {
            id: { label: 'r2' },
            updated: { label: '2025-09-04T10:00:00Z' },
            title: { label: 'Bug' },
            content: { label: 'Bad' },
            'im:rating': { label: '2' },
            'im:version': { label: '1.1' },
            author: { name: { label: 'B' } },
            link: { attributes: { href: 'https://example.com/r2' } },
          },
        ],
      },
    });

    // fetch mock: 1) JSON, 2..3) Discord posts
    fetchMock
      .mockResolvedValueOnce({ ok: true, text: async () => feedJson })
      .mockResolvedValue({ ok: true, text: async () => '' });

    const { runAppStoreReviewJob } = await import('../appStoreReviewNotifier');
    await runAppStoreReviewJob();

    // 1 (JSON) + 1 (Discord batched) = 2 calls
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // state saved
    const saved = gcsStore.get('test-bucket/states/appstore.json');
    expect(saved).toBeTruthy();
    const json = JSON.parse(String(saved));
    expect(new Date(json.lastUpdated).toISOString()).toBe(
      '2025-09-04T10:00:00.000Z'
    );
    expect(Array.isArray(json.lastIds)).toBe(true);
  });

  test('新着なしならDiscordへ送信しない', async () => {
    // 事前にstateを最新にしておく
    gcsStore.set(
      'test-bucket/states/appstore.json',
      JSON.stringify({
        lastUpdated: '2025-09-05T00:00:00.000Z',
        lastIds: ['rX'],
      })
    );

    const feedJson = JSON.stringify({
      feed: {
        entry: [
          {
            id: { label: 'r1' },
            updated: { label: '2025-09-03T10:00:00Z' },
            title: { label: 'Old' },
            content: { label: 'Old' },
            'im:rating': { label: '5' },
            author: { name: { label: 'A' } },
          },
        ],
      },
    });

    fetchMock
      .mockResolvedValueOnce({ ok: true, text: async () => feedJson })
      .mockResolvedValue({ ok: true, text: async () => '' });

    const { runAppStoreReviewJob } = await import('../appStoreReviewNotifier');
    await runAppStoreReviewJob();

    // JSONの1回のみ
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
