import { fetch as expoFetch } from 'expo/fetch';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { getSessionToken } from '~/lib/session';
import { workerUrl } from '~/lib/workerApi';
import { stationAtom } from '~/store/atoms/station';
import { isJapanese } from '~/translation';
import { resolveAgentLocale } from '~/utils/agentLocale';
import { createSSEParser, parseSSEChunk, type SSEEvent } from '~/utils/sse';

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

// AgentChatResult 相当のオブジェクト(done イベント本文 / 非ストリーミングの
// result フィールド)を検証して確定応答へ変換する
const toChatResultFromObject = (
  parsed: Record<string, unknown> | null
): AgentChatResult | null => {
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

// done イベントの本文(AgentChatResult と同一形)を検証して確定応答へ変換する
const toChatResult = (data: string): AgentChatResult | null =>
  toChatResultFromObject(parseEventData(data));

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
// ストリーミング/非ストリーミングで共通のリクエストボディ(callable 互換の
// ワイヤ形式)を組み立てる
const buildRequestBody = (
  messages: AgentMessage[],
  currentStationGroupId: number | undefined
): string => {
  const trimmed = trimAgentMessages(messages);
  return JSON.stringify({
    data: {
      messages: trimmed,
      // locale はサーバが応答言語の指示に使う。端末の言語設定ではなく
      // ユーザが実際に書いた言語に合わせ、判定できないときだけ端末設定に倒す
      // (英語端末で日本語を打っても日本語で返るようにするため)。
      // サーバへ送る本文と同じ(切り詰め後の)履歴から判定する。
      locale: resolveAgentLocale(trimmed, isJapanese ? 'ja' : 'en'),
      ...(currentStationGroupId != null ? { currentStationGroupId } : {}),
    },
  });
};

const streamRequestHeaders = (idToken: string): Record<string, string> => ({
  'content-type': 'application/json; charset=UTF-8',
  accept: 'text/event-stream',
  Authorization: `Bearer ${idToken}`,
});

/**
 * expo/fetch の ReadableStream で SSE を逐次読む(Android / web 経路)。
 */
const sendViaExpoFetchStream = async (
  body: string,
  handlers: AgentStreamHandlers | undefined
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
    const res = await expoFetch(workerUrl('/agent/chat/stream'), {
      method: 'POST',
      headers: streamRequestHeaders(idToken),
      body,
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
};

/**
 * XMLHttpRequest の逐次テキスト受信で SSE を読む(iOS 経路)。
 *
 * iOS の expo/fetch はネイティブ実装の既知不具合(expo/expo#42161 のチャンク
 * 欠落・順序逆転、expo/expo#44909 の close 競合)でストリーミングが成立しない
 * ため、React Native 標準の XHR を使う。onreadystatechange と onprogress を
 * send() 前に登録すると RN の XHR が逐次配送を有効にする(react-native-sse と
 * 同じ仕組み)ので、responseText の未処理分を毎回切り出して解釈する。
 */
const sendViaXhrStream = async (
  body: string,
  handlers: AgentStreamHandlers | undefined
): Promise<AgentChatResponse> => {
  // トークン取得の失敗は network 扱い(このケースもフォールバックの対象)
  const idToken = await getSessionToken().catch(() => null);
  if (!idToken) {
    return { ok: false, error: 'network' };
  }

  return new Promise<AgentChatResponse>((resolve) => {
    const xhr = new XMLHttpRequest();
    // abort 起因の readyState 遷移で確定済みの結果を上書きしないためのガード
    let settled = false;
    let timedOut = false;
    // responseText のうち解釈済みの文字数と、イベント途中で切れた残余
    let seen = 0;
    let pending = '';
    let statusChecked = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      xhr.abort();
      settle({ ok: false, error: 'timeout' });
    }, AGENT_REQUEST_TIMEOUT_MS);

    const settle = (response: AgentChatResponse): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      resolve(response);
    };

    // ストリーム開始前のエラーは HTTP ステータスで判定して打ち切る
    const checkStatus = (): void => {
      if (statusChecked) {
        return;
      }
      statusChecked = true;
      if (xhr.status === 429) {
        settle({ ok: false, error: 'rateLimited' });
        xhr.abort();
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        settle({ ok: false, error: 'network' });
        xhr.abort();
      }
    };

    const consume = (): void => {
      const text = xhr.responseText;
      if (text.length <= seen) {
        return;
      }
      const chunk = text.slice(seen);
      seen = text.length;

      const { events, rest } = parseSSEChunk(pending, chunk);
      pending = rest;
      for (const event of events) {
        const handled = handleStreamEvent(event, handlers);
        if (handled) {
          settle(handled);
          // 確定応答が出たら残りは読まない
          xhr.abort();
          return;
        }
      }
    };

    const handleProgress = (): void => {
      if (settled) {
        return;
      }
      if (xhr.readyState >= 2) {
        checkStatus();
        if (settled) {
          return;
        }
      }
      if (xhr.readyState >= 3) {
        consume();
        if (settled) {
          return;
        }
      }
      if (xhr.readyState === 4) {
        // done も error も来ずにストリームが終わった場合
        settle({ ok: false, error: timedOut ? 'timeout' : 'network' });
      }
    };

    xhr.open('POST', workerUrl('/agent/chat/stream'));
    const headers = streamRequestHeaders(idToken);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    // 逐次配送を有効にするため send() より前に両方のリスナを登録する
    xhr.onreadystatechange = handleProgress;
    xhr.onprogress = handleProgress;
    xhr.onerror = () => {
      settle({ ok: false, error: timedOut ? 'timeout' : 'network' });
    };

    xhr.send(body);
  });
};

/**
 * 非ストリーミングの POST /agent/chat(React Native 標準の fetch + JSON)。
 * ストリーミングがネットワーク系の失敗をしたときのフォールバック経路。
 */
const sendViaJson = async (body: string): Promise<AgentChatResponse> => {
  const controller = new AbortController();
  // fetch は中断時に AbortError を投げるが、判定は自前のフラグで行う
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

    const res = await globalThis.fetch(workerUrl('/agent/chat'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        accept: 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body,
      signal: controller.signal,
    });

    if (res.status === 429) {
      return { ok: false, error: 'rateLimited' };
    }
    if (!res.ok) {
      return { ok: false, error: 'network' };
    }

    const json: unknown = await res.json();
    const result =
      typeof json === 'object' && json !== null
        ? (json as { result?: unknown }).result
        : null;
    const data = toChatResultFromObject(
      typeof result === 'object' && result !== null && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : null
    );
    return data ? { ok: true, data } : { ok: false, error: 'network' };
  } catch (err) {
    if (timedOut || (err instanceof Error && err.name === 'AbortError')) {
      return { ok: false, error: 'timeout' };
    }
    return { ok: false, error: 'network' };
  } finally {
    clearTimeout(timeoutId);
  }
};

// iOS だけ XHR 経路を使う(expo/fetch の iOS 実装がストリーミングで壊れるため)
const sendViaStream = (
  body: string,
  handlers: AgentStreamHandlers | undefined
): Promise<AgentChatResponse> =>
  Platform.OS === 'ios'
    ? sendViaXhrStream(body, handlers)
    : sendViaExpoFetchStream(body, handlers);

export const useDestinationAgent = (): {
  sendMessages: (
    messages: AgentMessage[],
    handlers?: AgentStreamHandlers
  ) => Promise<AgentChatResponse>;
} => {
  const station = useAtomValue(stationAtom);
  const currentStationGroupId = station?.groupId ?? undefined;

  // セッショントークンを画面マウント時に先読みしておく。アプリ起動後の初回送信では
  // /auth/token の往復が送信の直列経路に入り、ストリーミング開始までの体感遅延に
  // 直結するため、ユーザが入力している間に取得を済ませてキャッシュに載せる。
  // getSessionToken はメモリキャッシュ付きで冪等・アラート等の可視副作用も無いため、
  // StrictMode による effect の再実行があっても安全(CLAUDE.md の StrictMode 規約)。
  // 失敗しても握りつぶす(送信時に再度取得され、そこでエラー処理される)。
  useEffect(() => {
    void getSessionToken().catch(() => undefined);
  }, []);

  const sendMessages = useCallback(
    async (
      messages: AgentMessage[],
      handlers?: AgentStreamHandlers
    ): Promise<AgentChatResponse> => {
      const body = buildRequestBody(messages, currentStationGroupId);
      const streamed = await sendViaStream(body, handlers);
      if (streamed.ok || streamed.error !== 'network') {
        // rateLimited は確定情報、timeout は既に 30 秒待たせているため
        // どちらも再送しない
        return streamed;
      }

      // ネットワーク系の失敗に限り、非ストリーミングへ 1 回だけフォールバックする。
      // 同一ターンを再送するのでサーバーのレート制限カウンタを 2 消費し得るが、
      // 応答をまったく返せないより望ましいと判断して許容する。
      // フォールバック中は onDelta / onToolStart を呼ばない(受信済み delta の
      // 部分テキストは表示されたまま残り、確定応答で置き換わる)。
      return sendViaJson(body);
    },
    [currentStationGroupId]
  );

  return { sendMessages };
};
