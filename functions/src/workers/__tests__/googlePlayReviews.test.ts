// Mocks
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
      store.set(this.key, typeof data === 'string' ? data : data.toString('utf8'));
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

const listMock = jest.fn();
jest.mock('@googleapis/androidpublisher', () => {
  return {
    androidpublisher: () => ({ reviews: { list: listMock } }),
    androidpublisher_v3: {},
    __listMock: listMock,
  };
});

// Mock fetch (Discord)
const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

describe('googlePlayReviewNotifier', () => {
  beforeEach(() => {
    jest.resetModules();
    gcsStore.clear();
    fetchMock.mockReset();
    listMock.mockReset();
    process.env.DISCORD_REVIEW_WEBHOOK_URL = 'https://discord.test/webhook';
    process.env.GOOGLEPLAY_REVIEW_STATE_GCS_URI = 'gs://test-bucket/states/googleplay.json';
    process.env.GOOGLE_PLAY_PACKAGE_NAME = 'me.tinykitten.trainlcd';
  });

  test('新着レビューのみ通知し、stateを更新する', async () => {
    // APIレスポンス（2レビュー）
    listMock.mockResolvedValueOnce({
      data: {
        reviews: [
          {
            reviewId: 'rev1',
            authorName: 'U1',
            comments: [
              {
                userComment: {
                  text: 'Good',
                  starRating: 5,
                  appVersionName: '1.0',
                  reviewerLanguage: 'ja',
                  lastModified: { seconds: 1693821600, nanos: 0 }, // 2023-09-04T12:00:00Z
                },
              },
            ],
          },
          {
            reviewId: 'rev2',
            authorName: 'U2',
            comments: [
              {
                userComment: {
                  text: 'Bad',
                  starRating: 2,
                  appVersionName: '1.1',
                  reviewerLanguage: 'en',
                  lastModified: { seconds: 1756960800, nanos: 0 }, // 2025-09-04T10:00:00Z
                },
              },
            ],
          },
        ],
      },
    });

    fetchMock.mockResolvedValue({ ok: true, text: async () => '' });

    const { runGooglePlayReviewJob } = await import('../googlePlayReviews');
    await runGooglePlayReviewJob();

    // Discordへ2件
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // state saved
    const saved = gcsStore.get('test-bucket/states/googleplay.json');
    expect(saved).toBeTruthy();
    const json = JSON.parse(String(saved));
    expect(new Date(json.lastUpdated).toISOString()).toBe(new Date(1756960800 * 1000).toISOString());
    expect(Array.isArray(json.lastIds)).toBe(true);
  });

  test('既読状態により重複を通知しない', async () => {
    const latestIso = '2025-09-04T10:00:00.000Z';
    const latestId = `rev2:${latestIso}`;
    gcsStore.set(
      'test-bucket/states/googleplay.json',
      JSON.stringify({ lastUpdated: latestIso, lastIds: [latestId] })
    );

    listMock.mockResolvedValueOnce({
      data: {
        reviews: [
          {
            reviewId: 'rev2',
            authorName: 'U2',
            comments: [
              {
                userComment: {
                  text: 'Bad',
                  starRating: 2,
                  appVersionName: '1.1',
                  reviewerLanguage: 'en',
                  lastModified: { seconds: 1756960800, nanos: 0 },
                },
              },
            ],
          },
        ],
      },
    });

    fetchMock.mockResolvedValue({ ok: true, text: async () => '' });

    const { runGooglePlayReviewJob } = await import('../googlePlayReviews');
    await runGooglePlayReviewJob();

    // 既読のためDiscord送信なし
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });
});
