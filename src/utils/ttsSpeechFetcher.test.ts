import { fetchSpeechAudio } from './ttsSpeechFetcher';

const mockFetch = jest.fn();

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

const defaultOptions = {
  textJa: 'こんにちは',
  textEn: 'Hello',
  apiUrl: 'https://api.example.com/tts',
  idToken: 'test-token',
};

describe('fetchSpeechAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it('成功レスポンスでファイルパスを返す', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          id: 'tts-123',
          jaAudioContent: 'QQ==',
          enAudioContent: 'QQ==',
        },
      }),
    });

    const result = await fetchSpeechAudio(defaultOptions);

    expect(result).toEqual({
      id: 'tts-123',
      pathJa: '/tmp/tts-123_ja.mp3',
      pathEn: '/tmp/tts-123_en.mp3',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/tts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('textJa が空の場合は null を返す', async () => {
    const result = await fetchSpeechAudio({ ...defaultOptions, textJa: '' });
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('textEn が空の場合は null を返す', async () => {
    const result = await fetchSpeechAudio({ ...defaultOptions, textEn: '' });
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('HTTP エラー時に null を返す', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await fetchSpeechAudio(defaultOptions);
    expect(result).toBeNull();
  });

  it('レスポンスに result.id がない場合は null を返す', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: {} }),
    });

    const result = await fetchSpeechAudio(defaultOptions);
    expect(result).toBeNull();
  });

  it('オーディオコンテンツが欠けている場合は null を返す', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          id: 'tts-123',
          jaAudioContent: 'QQ==',
          enAudioContent: null,
        },
      }),
    });

    const result = await fetchSpeechAudio(defaultOptions);
    expect(result).toBeNull();
  });

  it('ネットワーク例外時に null を返す', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await fetchSpeechAudio(defaultOptions);
    expect(result).toBeNull();
  });

  it('SSML でテキストをラップしてリクエストする', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          id: 'tts-123',
          jaAudioContent: 'QQ==',
          enAudioContent: 'QQ==',
        },
      }),
    });

    await fetchSpeechAudio({
      ...defaultOptions,
      textJa: '  テスト  ',
      textEn: '  test  ',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data.ssmlJa).toBe('<speak>テスト</speak>');
    expect(body.data.ssmlEn).toBe('<speak>test</speak>');
  });
});
