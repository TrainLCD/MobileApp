import { renderHook } from '@testing-library/react-native';
import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';
import { getSessionToken } from '~/lib/session';
import {
  AGENT_MAX_MESSAGES,
  AGENT_REQUEST_TIMEOUT_MS,
  type AgentMessage,
  trimAgentMessages,
  useDestinationAgent,
} from './useDestinationAgent';

jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

jest.mock('~/lib/workerApi', () => ({
  workerUrl: (path: string) => `https://worker.test${path}`,
}));

jest.mock('~/lib/session', () => ({
  getSessionToken: jest.fn(async () => 'test-session-token'),
}));

const fetchMock = fetch as unknown as jest.Mock;
const getSessionTokenMock = getSessionToken as jest.Mock;

// jest-expo の既定 Platform.OS は 'ios'。ストリーミング経路は iOS だけ XHR に
// 分岐するため、テストごとに明示的に切り替えて afterEach で元へ戻す。
const originalPlatformOS = Platform.OS;
const setPlatformOS = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

// 非ストリーミングのフォールバックは expo/fetch ではなく標準 fetch を使う。
// 既定では失敗させ、ストリーミング経路だけを見るテストの期待値を保つ。
const originalGlobalFetch = globalThis.fetch;
let fallbackFetchMock: jest.Mock;

const mockFallbackResponse = (body: unknown, status = 200) => {
  fallbackFetchMock = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
  globalThis.fetch = fallbackFetchMock as unknown as typeof globalThis.fetch;
  return fallbackFetchMock;
};

beforeEach(() => {
  fallbackFetchMock = jest.fn(async () => {
    throw new TypeError('Network request failed');
  });
  globalThis.fetch = fallbackFetchMock as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalGlobalFetch;
  setPlatformOS(originalPlatformOS);
  jest.clearAllMocks();
});

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/** チャンク列を順に返す最小の ReadableStreamDefaultReader 相当を作る */
const mockStreamResponse = (chunks: (string | Uint8Array)[], status = 200) => {
  let index = 0;
  const cancel = jest.fn(async () => undefined);
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    body: {
      getReader: () => ({
        read: async () => {
          if (index >= chunks.length) {
            return { done: true, value: undefined };
          }
          const chunk = chunks[index];
          index += 1;
          return {
            done: false,
            value: typeof chunk === 'string' ? encode(chunk) : chunk,
          };
        },
        cancel,
      }),
    },
  });
  return { cancel };
};

const mockErrorResponse = (status: number) => {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status,
    body: null,
  });
};

/** done イベントだけを流す SSE 本文 */
const doneEvent = (result: unknown) =>
  `event: done\ndata: ${JSON.stringify(result)}\n\n`;

const renderSendMessages = () => {
  const { result } = renderHook(() => useDestinationAgent());
  return result.current.sendMessages;
};

const getRequestBody = () => JSON.parse(fetchMock.mock.calls[0][1].body);

describe('trimAgentMessages', () => {
  it('12件を超える履歴は古いものから捨てる', () => {
    const messages: AgentMessage[] = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `message-${i}`,
    }));

    const trimmed = trimAgentMessages(messages);

    expect(trimmed).toHaveLength(AGENT_MAX_MESSAGES);
    expect(trimmed[0].content).toBe('message-3');
    expect(trimmed[AGENT_MAX_MESSAGES - 1].content).toBe('message-14');
  });

  it('1メッセージ500文字を超える本文は切り詰める', () => {
    const trimmed = trimAgentMessages([
      { role: 'user', content: 'あ'.repeat(600) },
    ]);

    expect(trimmed[0].content).toHaveLength(500);
  });

  it('上限内の履歴はそのまま通す', () => {
    const messages: AgentMessage[] = [
      { role: 'user', content: '海が見える駅に行きたい' },
    ];

    expect(trimAgentMessages(messages)).toEqual(messages);
  });
});

describe('useDestinationAgent', () => {
  // expo/fetch の ReadableStream 経路(iOS 以外)
  beforeEach(() => {
    setPlatformOS('android');
  });

  it('マウント時にセッショントークンを先読みする', () => {
    renderHook(() => useDestinationAgent());

    // 送信の直列経路から /auth/token の往復を外すための先読み。
    // この時点ではチャット API は呼ばない
    expect(getSessionTokenMock).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('先読みが失敗しても例外を投げない', async () => {
    getSessionTokenMock.mockRejectedValueOnce(new Error('network'));

    expect(() => renderHook(() => useDestinationAgent())).not.toThrow();
    // 未処理の rejection にならないことを確認するためマイクロタスクを流す
    await Promise.resolve();
  });

  it('done イベントを reply / suggestions / refused に詰めて返す', async () => {
    mockStreamResponse([
      doneEvent({
        reply: '海の見える駅でしたら、こちらはいかがでしょうか。',
        suggestions: [
          {
            stationId: 1130205,
            stationGroupId: 1130205,
            name: '鎌倉',
            nameRoman: 'Kamakura',
            lineNames: ['JR横須賀線'],
          },
        ],
        refused: false,
      }),
    ]);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: '海が見たい' }]);

    expect(res).toEqual({
      ok: true,
      data: {
        reply: '海の見える駅でしたら、こちらはいかがでしょうか。',
        suggestions: [
          {
            stationId: 1130205,
            stationGroupId: 1130205,
            name: '鎌倉',
            nameRoman: 'Kamakura',
            lineNames: ['JR横須賀線'],
          },
        ],
        refused: false,
      },
    });
  });

  it('セッショントークン付きで callable 互換のワイヤ形式をストリーミング用エンドポイントへ送る', async () => {
    mockStreamResponse([
      doneEvent({ reply: 'ok', suggestions: [], refused: false }),
    ]);

    const sendMessages = renderSendMessages();
    await sendMessages([{ role: 'user', content: 'テスト' }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://worker.test/agent/chat/stream');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-session-token');
    expect(init.headers.accept).toBe('text/event-stream');
    expect(getRequestBody()).toEqual({
      data: {
        messages: [{ role: 'user', content: 'テスト' }],
        locale: expect.stringMatching(/^(ja|en)$/),
      },
    });
  });

  it('12件を超える履歴は切り詰めてから送信する', async () => {
    mockStreamResponse([
      doneEvent({ reply: 'ok', suggestions: [], refused: false }),
    ]);

    const sendMessages = renderSendMessages();
    await sendMessages(
      Array.from({ length: 15 }, (_, i) => ({
        role: 'user' as const,
        content: `message-${i}`,
      }))
    );

    const body = getRequestBody();
    expect(body.data.messages).toHaveLength(AGENT_MAX_MESSAGES);
    expect(body.data.messages[0].content).toBe('message-3');
  });

  it('delta を受信順に onDelta へ渡し、done の確定値を返す', async () => {
    mockStreamResponse([
      'event: delta\ndata: {"text":"海の"}\n\n',
      'event: delta\ndata: {"text":"見える駅"}\n\n',
      doneEvent({
        reply: '海の見える駅はこちらです。',
        suggestions: [],
        refused: false,
      }),
    ]);

    const onDelta = jest.fn();
    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: '海が見たい' }], {
      onDelta,
    });

    expect(onDelta.mock.calls.map(([text]) => text)).toEqual([
      '海の',
      '見える駅',
    ]);
    expect(res).toEqual({
      ok: true,
      data: {
        reply: '海の見える駅はこちらです。',
        suggestions: [],
        refused: false,
      },
    });
  });

  it('チャンク境界を跨いだイベントも取りこぼさない', async () => {
    const payload = `event: delta\ndata: {"text":"あい"}\n\n${doneEvent({
      reply: 'あいうえお',
      suggestions: [],
      refused: false,
    })}`;
    const bytes = encode(payload);

    mockStreamResponse([
      bytes.slice(0, 25),
      bytes.slice(25, 60),
      bytes.slice(60),
    ]);

    const onDelta = jest.fn();
    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }], {
      onDelta,
    });

    expect(onDelta).toHaveBeenCalledWith('あい');
    expect(res.ok).toBe(true);
  });

  it('tool イベントで onToolStart を呼ぶ', async () => {
    mockStreamResponse([
      'event: tool\ndata: {}\n\n',
      doneEvent({ reply: 'ok', suggestions: [], refused: false }),
    ]);

    const onToolStart = jest.fn();
    const sendMessages = renderSendMessages();
    await sendMessages([{ role: 'user', content: 'テスト' }], { onToolStart });

    expect(onToolStart).toHaveBeenCalledTimes(1);
  });

  it('未知のイベントは無視する', async () => {
    mockStreamResponse([
      'event: future\ndata: {"foo":1}\n\n',
      ': keep-alive\n\n',
      doneEvent({ reply: 'ok', suggestions: [], refused: false }),
    ]);

    const onDelta = jest.fn();
    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }], {
      onDelta,
    });

    expect(onDelta).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
  });

  it('refused: true をそのまま返す', async () => {
    mockStreamResponse([
      doneEvent({
        reply: 'ご案内できません。',
        suggestions: [],
        refused: true,
      }),
    ]);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: '今日の天気は' }]);

    expect(res).toEqual({
      ok: true,
      data: { reply: 'ご案内できません。', suggestions: [], refused: true },
    });
  });

  it('形の合わない suggestions 要素は落とす', async () => {
    mockStreamResponse([
      doneEvent({
        reply: 'ok',
        suggestions: [
          {
            stationId: 1,
            stationGroupId: 1,
            name: 'A',
            nameRoman: 'A',
            lineNames: [],
          },
          { name: 'B' },
          null,
        ],
        refused: false,
      }),
    ]);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.suggestions).toHaveLength(1);
      expect(res.data.suggestions[0].stationId).toBe(1);
    }
  });

  it('429 は rateLimited を返す', async () => {
    mockErrorResponse(429);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'rateLimited' });
  });

  it('5xx は network を返す', async () => {
    mockErrorResponse(503);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'network' });
  });

  it('ネットワークエラーは network を返す', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'network' });
  });

  it('中断(タイムアウト)は timeout を返す', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(abortError);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'timeout' });
  });

  it('30 秒でストリーム受信を打ち切り timeout を返す', async () => {
    jest.useFakeTimers();

    let rejectRead: ((error: Error) => void) | undefined;
    const cancel = jest.fn(async () => undefined);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: () =>
            new Promise((_resolve, reject) => {
              rejectRead = reject;
            }),
          cancel,
        }),
      },
    });

    const sendMessages = renderSendMessages();
    const promise = sendMessages([{ role: 'user', content: 'テスト' }]);

    // read 待ちに入るまでマイクロタスクを流してからタイムアウトを進める
    await jest.advanceTimersByTimeAsync(AGENT_REQUEST_TIMEOUT_MS);
    // expo/fetch は中断時に AbortError ではなく通常の Error を投げる
    rejectRead?.(new Error('fetch failed: canceled'));

    await expect(promise).resolves.toEqual({ ok: false, error: 'timeout' });

    jest.useRealTimers();
  });

  it('error イベントは network を返し、受信済み delta は確定値にしない', async () => {
    mockStreamResponse([
      'event: delta\ndata: {"text":"途中まで"}\n\n',
      'event: error\ndata: {"code":"internal"}\n\n',
    ]);

    const onDelta = jest.fn();
    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }], {
      onDelta,
    });

    expect(onDelta).toHaveBeenCalledWith('途中まで');
    expect(res).toEqual({ ok: false, error: 'network' });
  });

  it('done 前にストリームが切れた場合は network を返す', async () => {
    mockStreamResponse(['event: delta\ndata: {"text":"途中まで"}\n\n']);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'network' });
  });

  it('reply を欠く壊れた done は network 扱いにする', async () => {
    mockStreamResponse([doneEvent({ suggestions: [] })]);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'network' });
  });

  it('done を受け取ったらストリームを解放する', async () => {
    const { cancel } = mockStreamResponse([
      doneEvent({ reply: 'ok', suggestions: [], refused: false }),
    ]);

    const sendMessages = renderSendMessages();
    await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(cancel).toHaveBeenCalled();
  });

  it('本文の無いレスポンスは network を返す', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, body: null });

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'network' });
  });

  it('ストリーミングが network で失敗したら非ストリーミングへフォールバックする', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    const fallback = mockFallbackResponse({
      result: {
        reply: 'フォールバック応答',
        suggestions: [{ stationId: 1, stationGroupId: 1 }],
        refused: false,
      },
    });

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({
      ok: true,
      data: {
        reply: 'フォールバック応答',
        suggestions: [{ stationId: 1, stationGroupId: 1 }],
        refused: false,
      },
    });
    const [url, init] = fallback.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://worker.test/agent/chat');
    expect(init.method).toBe('POST');
    // ボディはストリーミングと同一(同一ターンの再送)
    expect(JSON.parse(String(init.body))).toEqual({
      data: {
        messages: [{ role: 'user', content: 'テスト' }],
        locale: expect.stringMatching(/^(ja|en)$/),
      },
    });
  });

  it('rateLimited はフォールバックしない', async () => {
    mockErrorResponse(429);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'rateLimited' });
    expect(fallbackFetchMock).not.toHaveBeenCalled();
  });

  it('フォールバックも失敗した場合はフォールバック側の結果を返す', async () => {
    mockErrorResponse(503);
    mockFallbackResponse({}, 500);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'network' });
    expect(fallbackFetchMock).toHaveBeenCalledTimes(1);
  });
});

/**
 * XHR の逐次テキスト受信を再現するフェイク。生成されたインスタンスを捕捉し、
 * テストから readyState / status / responseText を進めてハンドラを発火させる。
 */
class FakeXhr {
  static instances: FakeXhr[] = [];

  readyState = 0;
  status = 0;
  responseText = '';
  aborted = false;
  method: string | null = null;
  url: string | null = null;
  requestHeaders: Record<string, string> = {};
  body: string | null = null;
  // send() 時点でリスナが登録されていたか(逐次配送の有効化条件)
  listenersAtSend = { readystatechange: false, progress: false };

  onreadystatechange: (() => void) | null = null;
  onprogress: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    FakeXhr.instances.push(this);
  }

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
    this.readyState = 1;
  }

  setRequestHeader(name: string, value: string): void {
    this.requestHeaders[name] = value;
  }

  send(body: string): void {
    this.body = body;
    this.listenersAtSend = {
      readystatechange: this.onreadystatechange != null,
      progress: this.onprogress != null,
    };
  }

  abort(): void {
    this.aborted = true;
  }

  /** ヘッダ受信(readyState 2)を通知する */
  emitHeaders(status: number): void {
    this.status = status;
    this.readyState = 2;
    this.onreadystatechange?.();
  }

  /** 本文の増分(readyState 3)を通知する */
  emitChunk(chunk: string, status = 200): void {
    this.status = status;
    this.responseText += chunk;
    this.readyState = 3;
    this.onreadystatechange?.();
    this.onprogress?.();
  }

  /** ストリーム終了(readyState 4)を通知する */
  emitEnd(status = 200): void {
    this.status = status;
    this.readyState = 4;
    this.onreadystatechange?.();
  }
}

const originalXhr = globalThis.XMLHttpRequest;

/** セッショントークン取得の await を消化してから XHR インスタンスを取り出す */
const takeXhr = async (): Promise<FakeXhr> => {
  for (let i = 0; i < 10 && FakeXhr.instances.length === 0; i++) {
    await Promise.resolve();
  }
  const xhr = FakeXhr.instances[FakeXhr.instances.length - 1];
  if (!xhr) {
    throw new Error('XMLHttpRequest が生成されていない');
  }
  return xhr;
};

describe('useDestinationAgent (iOS / XHR ストリーミング)', () => {
  beforeEach(() => {
    setPlatformOS('ios');
    FakeXhr.instances = [];
    globalThis.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
  });

  afterEach(() => {
    globalThis.XMLHttpRequest = originalXhr;
    // アサーション失敗時もフェイクタイマーを後続テストへ漏らさない
    jest.useRealTimers();
  });

  it('expo/fetch ではなく XHR でストリーミング用エンドポイントへ送る', async () => {
    const sendMessages = renderSendMessages();
    const promise = sendMessages([{ role: 'user', content: 'テスト' }]);
    const xhr = await takeXhr();
    xhr.emitChunk(doneEvent({ reply: 'ok', suggestions: [], refused: false }));

    await expect(promise).resolves.toEqual({
      ok: true,
      data: { reply: 'ok', suggestions: [], refused: false },
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('https://worker.test/agent/chat/stream');
    expect(xhr.requestHeaders.Authorization).toBe('Bearer test-session-token');
    expect(xhr.requestHeaders.accept).toBe('text/event-stream');
    expect(JSON.parse(String(xhr.body))).toEqual({
      data: {
        messages: [{ role: 'user', content: 'テスト' }],
        locale: expect.stringMatching(/^(ja|en)$/),
      },
    });
    // 逐次配送は send() 前のリスナ登録が条件
    expect(xhr.listenersAtSend).toEqual({
      readystatechange: true,
      progress: true,
    });
  });

  it('分割された delta を受信順に onDelta へ渡し、done の確定値を返す', async () => {
    const onDelta = jest.fn();
    const sendMessages = renderSendMessages();
    const promise = sendMessages([{ role: 'user', content: '海が見たい' }], {
      onDelta,
    });

    const xhr = await takeXhr();
    xhr.emitHeaders(200);
    xhr.emitChunk('event: delta\ndata: {"text":"海の"}\n\n');
    xhr.emitChunk('event: delta\ndata: {"text":"見える駅"}\n\n');
    xhr.emitChunk(
      doneEvent({
        reply: '海の見える駅はこちらです。',
        suggestions: [],
        refused: false,
      })
    );

    expect(onDelta.mock.calls.map(([text]) => text)).toEqual([
      '海の',
      '見える駅',
    ]);
    await expect(promise).resolves.toEqual({
      ok: true,
      data: {
        reply: '海の見える駅はこちらです。',
        suggestions: [],
        refused: false,
      },
    });
    // 確定応答が出たら残りは読まない
    expect(xhr.aborted).toBe(true);
  });

  it('チャンク境界を跨いだイベントも取りこぼさない', async () => {
    const payload = `event: delta\ndata: {"text":"あい"}\n\n${doneEvent({
      reply: 'あいうえお',
      suggestions: [],
      refused: false,
    })}`;

    const onDelta = jest.fn();
    const sendMessages = renderSendMessages();
    const promise = sendMessages([{ role: 'user', content: 'テスト' }], {
      onDelta,
    });

    const xhr = await takeXhr();
    xhr.emitChunk(payload.slice(0, 12));
    xhr.emitChunk(payload.slice(12, 40));
    xhr.emitChunk(payload.slice(40));

    expect(onDelta).toHaveBeenCalledWith('あい');
    await expect(promise).resolves.toEqual({
      ok: true,
      data: { reply: 'あいうえお', suggestions: [], refused: false },
    });
  });

  it('tool イベントで onToolStart を呼ぶ', async () => {
    const onToolStart = jest.fn();
    const sendMessages = renderSendMessages();
    const promise = sendMessages([{ role: 'user', content: 'テスト' }], {
      onToolStart,
    });

    const xhr = await takeXhr();
    xhr.emitChunk('event: tool\ndata: {}\n\n');
    xhr.emitChunk(doneEvent({ reply: 'ok', suggestions: [], refused: false }));

    expect(onToolStart).toHaveBeenCalledTimes(1);
    await expect(promise).resolves.toEqual({
      ok: true,
      data: { reply: 'ok', suggestions: [], refused: false },
    });
  });

  it('429 は rateLimited を返し、フォールバックしない', async () => {
    const sendMessages = renderSendMessages();
    const promise = sendMessages([{ role: 'user', content: 'テスト' }]);

    const xhr = await takeXhr();
    xhr.emitHeaders(429);

    await expect(promise).resolves.toEqual({
      ok: false,
      error: 'rateLimited',
    });
    expect(xhr.aborted).toBe(true);
    expect(fallbackFetchMock).not.toHaveBeenCalled();
  });

  it('done が来ないまま終了したら非ストリーミングへフォールバックする', async () => {
    const fallback = mockFallbackResponse({
      result: { reply: 'フォールバック応答', suggestions: [], refused: false },
    });

    const sendMessages = renderSendMessages();
    const promise = sendMessages([{ role: 'user', content: 'テスト' }]);

    const xhr = await takeXhr();
    xhr.emitChunk('event: delta\ndata: {"text":"途中まで"}\n\n');
    xhr.emitEnd();

    await expect(promise).resolves.toEqual({
      ok: true,
      data: { reply: 'フォールバック応答', suggestions: [], refused: false },
    });
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(fallback.mock.calls[0][0]).toBe('https://worker.test/agent/chat');
  });

  it('フォールバックも失敗したら network を返す', async () => {
    const sendMessages = renderSendMessages();
    const promise = sendMessages([{ role: 'user', content: 'テスト' }]);

    const xhr = await takeXhr();
    xhr.emitEnd(200);

    await expect(promise).resolves.toEqual({ ok: false, error: 'network' });
    expect(fallbackFetchMock).toHaveBeenCalledTimes(1);
  });

  it('通信エラー(onerror)は network を返す', async () => {
    const sendMessages = renderSendMessages();
    const promise = sendMessages([{ role: 'user', content: 'テスト' }]);

    const xhr = await takeXhr();
    xhr.onerror?.();

    await expect(promise).resolves.toEqual({ ok: false, error: 'network' });
  });

  it('30 秒経過で timeout を返し、フォールバックしない', async () => {
    jest.useFakeTimers();

    const sendMessages = renderSendMessages();
    const promise = sendMessages([{ role: 'user', content: 'テスト' }]);

    const xhr = await takeXhr();
    await jest.advanceTimersByTimeAsync(AGENT_REQUEST_TIMEOUT_MS);
    // abort 由来の readyState 遷移で network に上書きされないこと
    xhr.emitEnd(0);

    await expect(promise).resolves.toEqual({ ok: false, error: 'timeout' });
    expect(xhr.aborted).toBe(true);
    expect(fallbackFetchMock).not.toHaveBeenCalled();
  });

  it('セッショントークンを取得できない場合は network を返す', async () => {
    getSessionTokenMock.mockResolvedValueOnce(null);
    getSessionTokenMock.mockResolvedValueOnce(null);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'network' });
    expect(FakeXhr.instances).toHaveLength(0);
  });
});
