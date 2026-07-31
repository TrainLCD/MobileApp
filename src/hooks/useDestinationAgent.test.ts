import { renderHook } from '@testing-library/react-native';
import { fetch } from 'expo/fetch';
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

afterEach(() => {
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
});
