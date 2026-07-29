import { renderHook } from '@testing-library/react-native';
import {
  AGENT_MAX_MESSAGES,
  type AgentMessage,
  trimAgentMessages,
  useDestinationAgent,
} from './useDestinationAgent';

jest.mock('~/lib/workerApi', () => ({
  workerUrl: (path: string) => `https://worker.test${path}`,
}));

jest.mock('~/lib/session', () => ({
  getSessionToken: jest.fn(async () => 'test-session-token'),
}));

const fetchMock = jest.fn();
const origFetch = global.fetch;
global.fetch = fetchMock as unknown as typeof fetch;

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = origFetch;
});

const mockJsonResponse = (body: unknown, status = 200) => {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
};

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
  it('正常応答を reply / suggestions / refused に詰めて返す', async () => {
    mockJsonResponse({
      result: {
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

  it('セッショントークン付きで callable 互換のワイヤ形式を送る', async () => {
    mockJsonResponse({
      result: { reply: 'ok', suggestions: [], refused: false },
    });

    const sendMessages = renderSendMessages();
    await sendMessages([{ role: 'user', content: 'テスト' }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://worker.test/agent/chat');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-session-token');
    expect(getRequestBody()).toEqual({
      data: {
        messages: [{ role: 'user', content: 'テスト' }],
        locale: expect.stringMatching(/^(ja|en)$/),
      },
    });
  });

  it('12件を超える履歴は切り詰めてから送信する', async () => {
    mockJsonResponse({
      result: { reply: 'ok', suggestions: [], refused: false },
    });

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

  it('refused: true をそのまま返す', async () => {
    mockJsonResponse({
      result: { reply: 'ご案内できません。', suggestions: [], refused: true },
    });

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: '今日の天気は' }]);

    expect(res).toEqual({
      ok: true,
      data: { reply: 'ご案内できません。', suggestions: [], refused: true },
    });
  });

  it('形の合わない suggestions 要素は落とす', async () => {
    mockJsonResponse({
      result: {
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
      },
    });

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.suggestions).toHaveLength(1);
      expect(res.data.suggestions[0].stationId).toBe(1);
    }
  });

  it('429 は rateLimited を返す', async () => {
    mockJsonResponse({}, 429);

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'rateLimited' });
  });

  it('5xx は network を返す', async () => {
    mockJsonResponse({}, 503);

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

  it('reply を欠く壊れた応答は network 扱いにする', async () => {
    mockJsonResponse({ result: { suggestions: [] } });

    const sendMessages = renderSendMessages();
    const res = await sendMessages([{ role: 'user', content: 'テスト' }]);

    expect(res).toEqual({ ok: false, error: 'network' });
  });
});
