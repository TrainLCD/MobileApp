import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { getSessionToken } from '~/lib/session';
import { workerUrl } from '~/lib/workerApi';
import { stationAtom } from '~/store/atoms/station';
import { isJapanese } from '~/translation';

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
// - network: ネットワーク断・5xx・その他 HTTP エラー・レスポンス破損
export type AgentErrorKind = 'rateLimited' | 'timeout' | 'network';

export type AgentChatResponse =
  | { ok: true; data: AgentChatResult }
  | { ok: false; error: AgentErrorKind };

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

export const useDestinationAgent = (): {
  sendMessages: (messages: AgentMessage[]) => Promise<AgentChatResponse>;
} => {
  const station = useAtomValue(stationAtom);
  const currentStationGroupId = station?.groupId ?? undefined;

  const sendMessages = useCallback(
    async (messages: AgentMessage[]): Promise<AgentChatResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        AGENT_REQUEST_TIMEOUT_MS
      );

      try {
        const idToken = await getSessionToken();
        if (!idToken) {
          return { ok: false, error: 'network' };
        }

        const res = await fetch(workerUrl('/agent/chat'), {
          method: 'POST',
          headers: {
            'content-type': 'application/json; charset=UTF-8',
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

        if (res.status === 429) {
          return { ok: false, error: 'rateLimited' };
        }
        if (!res.ok) {
          return { ok: false, error: 'network' };
        }

        const json = (await res.json()) as {
          result?: Partial<AgentChatResult>;
        };
        const result = json?.result;
        if (!result || typeof result.reply !== 'string') {
          return { ok: false, error: 'network' };
        }

        return {
          ok: true,
          data: {
            reply: result.reply,
            // サーバー応答は untrusted として扱い、形の合わない要素は落とす
            suggestions: Array.isArray(result.suggestions)
              ? result.suggestions.filter(isAgentSuggestion)
              : [],
            refused: result.refused === true,
          },
        };
      } catch (err) {
        // AbortController による中断はタイムアウトのみ(呼び出し側からの中断経路は無い)
        if (err instanceof Error && err.name === 'AbortError') {
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
