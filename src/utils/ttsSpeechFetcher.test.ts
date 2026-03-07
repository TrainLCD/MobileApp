import { mockFetch } from '~/utils/test/ttsMocks';
import { fetchSpeechAudio } from './ttsSpeechFetcher';

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
      pathJa: '/tmp/tts-123_ja.wav',
      pathEn: '/tmp/tts-123_en.wav',
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

  it('PCM MIME の場合は WAV として保存する', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          id: 'tts-124',
          jaAudioContent: 'AAECAw==',
          enAudioContent: 'AAECAw==',
          jaAudioMimeType: 'audio/pcm;rate=24000',
          enAudioMimeType: 'audio/L16;rate=24000',
        },
      }),
    });

    const result = await fetchSpeechAudio(defaultOptions);

    expect(result).toEqual({
      id: 'tts-124',
      pathJa: '/tmp/tts-124_ja.wav',
      pathEn: '/tmp/tts-124_en.wav',
    });
  });

  it('MP3 MIME の場合は MP3 として保存する', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          id: 'tts-125',
          jaAudioContent: 'QQ==',
          enAudioContent: 'QQ==',
          jaAudioMimeType: 'audio/mpeg',
          enAudioMimeType: 'audio/mp3',
        },
      }),
    });

    const result = await fetchSpeechAudio(defaultOptions);

    expect(result).toEqual({
      id: 'tts-125',
      pathJa: '/tmp/tts-125_ja.mp3',
      pathEn: '/tmp/tts-125_en.mp3',
    });
  });

  it('MIME 不明の場合は WAV として保存する', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          id: 'tts-126',
          jaAudioContent: 'AAECAw==',
          enAudioContent: 'AAECAw==',
        },
      }),
    });

    const result = await fetchSpeechAudio(defaultOptions);

    expect(result).toEqual({
      id: 'tts-126',
      pathJa: '/tmp/tts-126_ja.wav',
      pathEn: '/tmp/tts-126_en.wav',
    });
  });
});
