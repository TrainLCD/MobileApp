import { mockFetch, mockFileDelete } from '~/utils/test/ttsMocks';
import {
  clearFetchCache,
  fetchSpeechAudio,
  MAX_FETCH_CACHE_SIZE,
  TTS_FETCH_TIMEOUT_MS,
} from './ttsSpeechFetcher';

const defaultOptions = {
  textJa: 'こんにちは',
  textEn: 'Hello',
  apiUrl: 'https://api.example.com/tts',
  idToken: 'test-token',
};

const okResponse = (result: Record<string, unknown>) => ({
  ok: true,
  json: async () => ({ result }),
});

const parseRequestBody = (callIndex = 0) =>
  JSON.parse(mockFetch.mock.calls[callIndex][1].body);

describe('fetchSpeechAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearFetchCache();
    // clearFetchCache 自体の削除呼び出しを次のテストへ持ち越さない
    mockFileDelete.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('成功レスポンスでファイルパスを返す', async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-123',
        jaAudioContent: 'QQ==',
        enAudioContent: 'QQ==',
      })
    );

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

  it('プレーンテキストをそのまま送信する（SSML でラップしない）', async () => {
    // Cloud TTS は input.text に渡された SSML を解釈せずタグをそのまま読み上げて
    // しまうため、呼び出し側が変換済みのプレーンテキストを送る契約になっている
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-123',
        jaAudioContent: 'QQ==',
        enAudioContent: 'QQ==',
      })
    );

    await fetchSpeechAudio({
      ...defaultOptions,
      textJa: '  テスト  ',
      textEn: '  test  ',
    });

    const body = parseRequestBody();
    expect(body.data.textJa).toBe('テスト');
    expect(body.data.textEn).toBe('test');
    expect(body.data.ssmlJa).toBeUndefined();
    expect(body.data.ssmlEn).toBeUndefined();
  });

  it('日英それぞれの音声名をリクエストに含める', async () => {
    // Cloud TTS のボイス名はロケールを含むため、日英で同じ名前は使えない
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-130',
        jaAudioContent: 'QQ==',
        enAudioContent: 'QQ==',
      })
    );

    await fetchSpeechAudio({
      ...defaultOptions,
      jaVoiceName: 'ja-JP-Standard-B',
      enVoiceName: 'en-US-Standard-G',
    });

    const body = parseRequestBody();
    expect(body.data).toEqual(
      expect.objectContaining({
        jaVoiceName: 'ja-JP-Standard-B',
        enVoiceName: 'en-US-Standard-G',
      })
    );
    // Standard 系にはモデル指定も読み方のプロンプト指示も無く、Worker は
    // 受け取っても無視するため送らない
    expect(body.data).not.toHaveProperty('model');
    expect(body.data).not.toHaveProperty('instructionsJa');
    expect(body.data).not.toHaveProperty('instructionsEn');
  });

  it('日本語のみ要求した場合は英語を送らず英語パスも返さない', async () => {
    // 合成は文字数課金のため、無効な言語を要求しないことを保証する
    mockFetch.mockResolvedValue(
      okResponse({ id: 'tts-131', jaAudioContent: 'QQ==' })
    );

    const result = await fetchSpeechAudio({ ...defaultOptions, textEn: '' });

    const body = parseRequestBody();
    expect(body.data.textJa).toBe('こんにちは');
    expect(body.data).not.toHaveProperty('textEn');
    expect(result).toEqual({
      id: 'tts-131',
      pathJa: '/tmp/tts-131_ja.wav',
      pathEn: null,
    });
  });

  it('英語のみ要求した場合は日本語を送らず日本語パスも返さない', async () => {
    mockFetch.mockResolvedValue(
      okResponse({ id: 'tts-132', enAudioContent: 'QQ==' })
    );

    const result = await fetchSpeechAudio({ ...defaultOptions, textJa: '' });

    const body = parseRequestBody();
    expect(body.data.textEn).toBe('Hello');
    expect(body.data).not.toHaveProperty('textJa');
    expect(result).toEqual({
      id: 'tts-132',
      pathJa: null,
      pathEn: '/tmp/tts-132_en.wav',
    });
  });

  it('日本語・英語ともに空の場合は null を返す', async () => {
    const result = await fetchSpeechAudio({
      ...defaultOptions,
      textJa: '',
      textEn: '',
    });
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
    mockFetch.mockResolvedValue(okResponse({}));

    const result = await fetchSpeechAudio(defaultOptions);
    expect(result).toBeNull();
  });

  it('要求した言語のオーディオが欠けている場合は null を返す', async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-123',
        jaAudioContent: 'QQ==',
        enAudioContent: null,
      })
    );

    const result = await fetchSpeechAudio(defaultOptions);
    expect(result).toBeNull();
  });

  it('ネットワーク例外時に null を返す', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await fetchSpeechAudio(defaultOptions);
    expect(result).toBeNull();
  });

  it('リクエストがハングした場合はタイムアウトで中断して null を返す', async () => {
    jest.useFakeTimers();
    try {
      let capturedSignal: AbortSignal | undefined;
      // 応答もエラーも返さないリクエストを再現し、abort されたら reject する
      mockFetch.mockImplementation(
        (_url: string, opts: { signal: AbortSignal }) => {
          capturedSignal = opts.signal;
          return new Promise((_resolve, reject) => {
            opts.signal.addEventListener('abort', () => {
              reject(new Error('Aborted'));
            });
          });
        }
      );

      const promise = fetchSpeechAudio({ ...defaultOptions, timeoutMs: 1000 });
      await jest.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toBeNull();
      expect(capturedSignal?.aborted).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('timeoutMs に不正値が渡されてもデフォルトのタイムアウトに正規化する', async () => {
    jest.useFakeTimers();
    try {
      let capturedSignal: AbortSignal | undefined;
      mockFetch.mockImplementation(
        (_url: string, opts: { signal: AbortSignal }) => {
          capturedSignal = opts.signal;
          return new Promise((_resolve, reject) => {
            opts.signal.addEventListener('abort', () => {
              reject(new Error('Aborted'));
            });
          });
        }
      );

      // timeoutMs: 0 は無効値。即座に abort せず既定値まで待つことを検証する
      const promise = fetchSpeechAudio({ ...defaultOptions, timeoutMs: 0 });
      await jest.advanceTimersByTimeAsync(0);
      expect(capturedSignal?.aborted).toBe(false);

      await jest.advanceTimersByTimeAsync(TTS_FETCH_TIMEOUT_MS);
      const result = await promise;

      expect(result).toBeNull();
      expect(capturedSignal?.aborted).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('英語テキストからマクロンを除去して送信する', async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-127',
        jaAudioContent: 'QQ==',
        enAudioContent: 'QQ==',
      })
    );

    await fetchSpeechAudio({
      ...defaultOptions,
      textEn: 'Kiryū and Ōhirashita',
    });

    const body = parseRequestBody();
    expect(body.data.textEn).toBe('Kiryu and Ohirashita');
  });

  it('マクロン有無で同じキャッシュを共有する', async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-129',
        jaAudioContent: 'QQ==',
        enAudioContent: 'QQ==',
      })
    );

    const first = await fetchSpeechAudio({
      ...defaultOptions,
      textEn: 'Tōkyō',
    });
    const second = await fetchSpeechAudio({
      ...defaultOptions,
      textEn: 'Tokyo',
    });

    expect(first).toEqual(second);
    // 2 回目はキャッシュヒットで fetch は 1 回だけ
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('音声が異なればキャッシュを共有しない', async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-133',
        jaAudioContent: 'QQ==',
        enAudioContent: 'QQ==',
      })
    );

    await fetchSpeechAudio({
      ...defaultOptions,
      jaVoiceName: 'ja-JP-Standard-B',
    });
    await fetchSpeechAudio({
      ...defaultOptions,
      jaVoiceName: 'ja-JP-Standard-C',
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('キャッシュは上限を超えたら最古のエントリから捨てる', async () => {
    mockFetch.mockImplementation(async () =>
      okResponse({
        id: 'tts-lru',
        jaAudioContent: 'QQ==',
        enAudioContent: 'QQ==',
      })
    );

    // 上限ぴったりまで別テキストで埋める
    for (let i = 0; i < MAX_FETCH_CACHE_SIZE; i += 1) {
      await fetchSpeechAudio({ ...defaultOptions, textJa: `テキスト${i}` });
    }
    expect(mockFetch).toHaveBeenCalledTimes(MAX_FETCH_CACHE_SIZE);

    // 直近のエントリはキャッシュに残っている
    await fetchSpeechAudio({
      ...defaultOptions,
      textJa: `テキスト${MAX_FETCH_CACHE_SIZE - 1}`,
    });
    expect(mockFetch).toHaveBeenCalledTimes(MAX_FETCH_CACHE_SIZE);

    // 上限を 1 つ超えさせると最古のエントリが押し出され、再取得が走る
    await fetchSpeechAudio({ ...defaultOptions, textJa: 'あふれさせる' });
    await fetchSpeechAudio({ ...defaultOptions, textJa: 'テキスト0' });
    expect(mockFetch).toHaveBeenCalledTimes(MAX_FETCH_CACHE_SIZE + 2);
  });

  it('退避したエントリの音声ファイルを削除する', async () => {
    // Map から捨てるだけだとキャッシュディレクトリに実ファイルが残り続ける
    mockFetch.mockImplementation(async () =>
      okResponse({
        id: 'tts-evict',
        jaAudioContent: 'QQ==',
        enAudioContent: 'QQ==',
      })
    );

    for (let i = 0; i <= MAX_FETCH_CACHE_SIZE; i += 1) {
      await fetchSpeechAudio({ ...defaultOptions, textJa: `テキスト${i}` });
    }

    expect(mockFileDelete.mock.calls.map(([uri]) => uri)).toEqual([
      '/tmp/tts-evict_ja.wav',
      '/tmp/tts-evict_en.wav',
    ]);
  });

  it('キャッシュクリア時に保持している音声ファイルを削除する', async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-clear',
        jaAudioContent: 'QQ==',
        enAudioContent: 'QQ==',
      })
    );

    await fetchSpeechAudio(defaultOptions);
    expect(mockFileDelete).not.toHaveBeenCalled();

    clearFetchCache();
    expect(mockFileDelete.mock.calls.map(([uri]) => uri)).toEqual([
      '/tmp/tts-clear_ja.wav',
      '/tmp/tts-clear_en.wav',
    ]);
  });

  it('id がファイル名として安全でない場合は null を返す', async () => {
    // パス区切りや .. を含む id をそのまま連結するとキャッシュ外へ書き込みうる
    for (const id of ['../evil', 'a/b', 'a\\b', '']) {
      clearFetchCache();
      mockFetch.mockResolvedValue(
        okResponse({ id, jaAudioContent: 'QQ==', enAudioContent: 'QQ==' })
      );
      expect(await fetchSpeechAudio(defaultOptions)).toBeNull();
    }
  });

  it('PCM MIME の場合は WAV として保存する', async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-124',
        jaAudioContent: 'AAECAw==',
        enAudioContent: 'AAECAw==',
        jaAudioMimeType: 'audio/pcm;rate=24000',
        enAudioMimeType: 'audio/L16;rate=24000',
      })
    );

    const result = await fetchSpeechAudio(defaultOptions);

    expect(result).toEqual({
      id: 'tts-124',
      pathJa: '/tmp/tts-124_ja.wav',
      pathEn: '/tmp/tts-124_en.wav',
    });
  });

  it('MP3 MIME の場合は MP3 として保存する', async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-125',
        jaAudioContent: 'QQ==',
        enAudioContent: 'QQ==',
        jaAudioMimeType: 'audio/mpeg',
        enAudioMimeType: 'audio/mp3',
      })
    );

    const result = await fetchSpeechAudio(defaultOptions);

    expect(result).toEqual({
      id: 'tts-125',
      pathJa: '/tmp/tts-125_ja.mp3',
      pathEn: '/tmp/tts-125_en.mp3',
    });
  });

  it('MIME 不明でも中身が MP3 なら MP3 として保存する', async () => {
    // Cloud TTS の既定応答は MP3。MIME 欠落時に PCM 扱いして WAV ヘッダーを
    // 被せると再生できなくなるため、先頭バイトで判定する
    // 'SUQz...' = "ID3" タグ、'/+AA' = 0xFF 0xE0 のフレーム同期
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-134',
        jaAudioContent: 'SUQzAAA=',
        enAudioContent: '/+AAAA==',
      })
    );

    const result = await fetchSpeechAudio(defaultOptions);

    expect(result).toEqual({
      id: 'tts-134',
      pathJa: '/tmp/tts-134_ja.mp3',
      pathEn: '/tmp/tts-134_en.mp3',
    });
  });

  it('MIME 不明で中身が WAV なら WAV として保存する', async () => {
    // "RIFF....WAVE"
    const riffWave = 'UklGRgAAAABXQVZF';
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-135',
        jaAudioContent: riffWave,
        enAudioContent: riffWave,
      })
    );

    const result = await fetchSpeechAudio(defaultOptions);

    expect(result).toEqual({
      id: 'tts-135',
      pathJa: '/tmp/tts-135_ja.wav',
      pathEn: '/tmp/tts-135_en.wav',
    });
  });

  it('MIME 不明で形式も判別できない場合は PCM とみなして WAV 化する', async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: 'tts-126',
        jaAudioContent: 'AAECAw==',
        enAudioContent: 'AAECAw==',
      })
    );

    const result = await fetchSpeechAudio(defaultOptions);

    expect(result).toEqual({
      id: 'tts-126',
      pathJa: '/tmp/tts-126_ja.wav',
      pathEn: '/tmp/tts-126_en.wav',
    });
  });
});
