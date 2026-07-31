import { fetch } from 'expo/fetch';
import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { getSessionToken } from '~/lib/session';
import { workerUrl } from '~/lib/workerApi';
import { stationAtom } from '~/store/atoms/station';
import { isJapanese } from '~/translation';
import { createSSEParser, type SSEEvent } from '~/utils/sse';

export type AgentMessageRole = 'user' | 'assistant';

export type AgentMessage = {
  role: AgentMessageRole;
  content: string;
};

export type AgentSuggestion = {
  stationId: number;
  stationGroupId: number;
  name: string;
  nameRoman: string;
  lineNames: string[];
};

export type AgentChatResult = {
  reply: string;
  suggestions: AgentSuggestion[];
  refused: boolean;
};

// UI 側で表示を分岐するためのエラー種別。
// - rateLimited: 429(日次上限)。入力バーを無効化し定型文を表示する
// - timeout: クライアント側 30 秒タイムアウト
// - network: ネットワーク断・5xx・その他 HTTP エラー・レスポンス破損・
//   ストリーム中断(error イベント / done 前の切断)
export type AgentErrorKind = 'rateLimited' | 'timeout' | 'network';

export type AgentChatResponse =
  | { ok: true; data: AgentChatResult }
  | { ok: false; error: AgentErrorKind };

// ストリーミング受信中の通知。確定応答は sendMessages の戻り値で受け取るため、
// ここでは途中経過の描画に必要なものだけを扱う。
export type AgentStreamHandlers = {
  /** reply 本文の増分。done で確定値に置き換えられる前提の暫定表示用 */
  onDelta?: (text: string) => void;
  /** ツール実行開始の合図(tool イベント) */
  onToolStart?: () => void;
};

// サーバー側の入力制約(architecture.md)。超過分はクライアントで先に切り詰めてから送る。
export const AGENT_MAX_MESSAGES = 12;
export const AGENT_MAX_MESSAGE_LENGTH = 500;
// サーバー全体の期限(25 秒)より長く取り、サーバーが先に諦めて確定応答を返す関係を保つ。
export const AGENT_REQUEST_TIMEOUT_MS = 30_000;

// 会話履歴をサーバー制約に合わせて切り詰める。件数超過時は古いものから捨て、
// 各メッセージ本文は先頭 500 文字までに切る。
export const trimAgentMessages = (messages: AgentMessage[]): AgentMessage[] =>
  messages.slice(-AGENT_MAX_MESSAGES).map((message) => ({
    role: message.role,
    content: message.content.slice(0, AGENT_MAX_MESSAGE_LENGTH),
  }));

const isAgentSuggestion = (value: unknown): value is AgentSuggestion => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const suggestion = value as Partial<AgentSuggestion>;
  return (
    typeof suggestion.stationId === 'number' &&
    typeof suggestion.stationGroupId === 'number'
  );
};

const parseEventData = (data: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(data);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

// done イベントの本文(AgentChatResult と同一形)を検証して確定応答へ変換する
const toChatResult = (data: string): AgentChatResult | null => {
  const parsed = parseEventData(data);
  if (!parsed || typeof parsed.reply !== 'string') {
    return null;
  }
  return {
    reply: parsed.reply,
    // サーバー応答は untrusted として扱い、形の合わない要素は落とす
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter(isAgentSuggestion)
      : [],
    refused: parsed.refused === true,
  };
};

/**
 * SSE イベントを 1 件処理する。ストリームを終える場合(done / error)のみ
 * 確定応答を返し、それ以外(delta / tool / 未知イベント)は null を返す。
 */
const handleStreamEvent = (
  event: SSEEvent,
  handlers: AgentStreamHandlers | undefined
): AgentChatResponse | null => {
  switch (event.event) {
    case 'delta': {
      const text = parseEventData(event.data)?.text;
      if (typeof text === 'string' && text.length) {
        handlers?.onDelta?.(text);
      }
      return null;
    }
    case 'tool':
      handlers?.onToolStart?.();
      return null;
    case 'done': {
      const result = toChatResult(event.data);
      return result
        ? { ok: true, data: result }
        : { ok: false, error: 'network' };
    }
    case 'error':
      // ストリーム開始後のエラーはネットワークエラーと同じ扱い
      // (受信済みの delta は画面側で破棄される)
      return { ok: false, error: 'network' };
    default:
      // 未知のイベント名は無視する(前方互換)
      return null;
  }
};

export const useDestinationAgent = (): {
  sendMessages: (
    messages: AgentMessage[],
    handlers?: AgentStreamHandlers
  ) => Promise<AgentChatResponse>;
} => {
  const station = useAtomValue(stationAtom);
  const currentStationGroupId = station?.groupId ?? undefined;

  const sendMessages = useCallback(
    async (
      messages: AgentMessage[],
      handlers?: AgentStreamHandlers
    ): Promise<AgentChatResponse> => {
      const controller = new AbortController();
      // expo/fetch は中断時に AbortError(name 付き)を投げるとは限らないため、
      // タイムアウトかどうかは自前のフラグで判定する
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, AGENT_REQUEST_TIMEOUT_MS);

      try {
        const idToken = await getSessionToken();
        if (!idToken) {
          return { ok: false, error: 'network' };
        }

        // ストリーミング対応の expo/fetch を使い、res.body を逐次読む
        const res = await fetch(workerUrl('/agent/chat/stream'), {
          method: 'POST',
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            accept: 'text/event-stream',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            data: {
              messages: trimAgentMessages(messages),
              locale: isJapanese ? 'ja' : 'en',
              ...(currentStationGroupId != null
                ? { currentStationGroupId }
                : {}),
            },
          }),
          signal: controller.signal,
        });

        // ストリーム開始前のエラーは従来どおり HTTP ステータスで判定する
        if (res.status === 429) {
          return { ok: false, error: 'rateLimited' };
        }
        if (!res.ok || !res.body) {
          return { ok: false, error: 'network' };
        }

        const reader = res.body.getReader();
        const parser = createSSEParser();
        let result: AgentChatResponse | null = null;

        try {
          while (!result) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            if (!value) {
              continue;
            }
            for (const event of parser.push(value)) {
              const handled = handleStreamEvent(event, handlers);
              if (handled) {
                result = handled;
                break;
              }
            }
          }
        } finally {
          // done を受け取って抜けた場合も含め、残りのストリームは読まない
          // (解放待ちで応答を遅らせないため完了は待たない)
          void reader.cancel().catch(() => undefined);
        }

        if (result) {
          return result;
        }
        // done も error も来ずにストリームが切れた場合はネットワークエラー扱い
        return { ok: false, error: timedOut ? 'timeout' : 'network' };
      } catch (err) {
        // AbortController による中断はタイムアウトのみ(呼び出し側からの中断経路は無い)
        if (timedOut || (err instanceof Error && err.name === 'AbortError')) {
          return { ok: false, error: 'timeout' };
        }
        return { ok: false, error: 'network' };
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [currentStationGroupId]
  );

  return { sendMessages };
};
