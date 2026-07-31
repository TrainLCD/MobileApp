/**
 * 最小の SSE(text/event-stream)パーサ。依存ゼロ。
 *
 * SSE クライアントライブラリを追加しない方針(docs/spec/ai-agent/architecture.md
 * 「クライアント設計 > API 呼び出し」)のため、必要な範囲だけを自前で実装する。
 * 解釈するのは `event:` / `data:` 行とイベント区切り(空行)のみで、
 * `id:` / `retry:` などその他のフィールドは無視する。
 */

export type SSEEvent = {
  /** イベント名。`event:` 行が無い場合は SSE 仕様の既定値 `message` */
  event: string;
  /** 複数行の `data:` を改行で連結した本文 */
  data: string;
};

export type SSEParseResult = {
  /** チャンク境界をまたいで完成したイベント列 */
  events: SSEEvent[];
  /** 次のチャンクへ持ち越す未完の残余 */
  rest: string;
};

/**
 * 1 イベント分のブロック(空行で区切られた行の集合)を解釈する。
 * 解釈できるフィールドが無いブロック(コメント行のみのキープアライブ等)は null。
 */
const parseEventBlock = (block: string): SSEEvent | null => {
  let event = '';
  const dataLines: string[] = [];
  let hasField = false;

  for (const line of block.split('\n')) {
    // 空行は区切りとして消費済みなので残っていても無視。
    // `:` 始まりはコメント行(キープアライブ)なので無視する。
    if (line.length === 0 || line.startsWith(':')) {
      continue;
    }

    const colonIndex = line.indexOf(':');
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    const rawValue = colonIndex === -1 ? '' : line.slice(colonIndex + 1);
    // 仕様どおり、コロン直後の空白 1 文字だけを取り除く
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;

    if (field === 'event') {
      event = value;
      hasField = true;
    } else if (field === 'data') {
      dataLines.push(value);
      hasField = true;
    }
  }

  if (!hasField) {
    return null;
  }

  return {
    event: event.length ? event : 'message',
    data: dataLines.join('\n'),
  };
};

/**
 * 前回の残余と新しいチャンク文字列から、完成したイベント列と次の残余を返す純関数。
 *
 * 改行は `\n` / `\r\n` を解釈する(SSE 仕様が許す単独 `\r` 区切りは、
 * 実運用のサーバが使わないため非対応)。イベントの途中でチャンクが切れた場合は
 * 未完部分を `rest` として返し、次回の呼び出しで結合して解釈する。
 */
export const parseSSEChunk = (
  pending: string,
  chunk: string
): SSEParseResult => {
  const buffer = `${pending}${chunk}`.replace(/\r\n/g, '\n');
  const events: SSEEvent[] = [];

  let rest = buffer;
  let separatorIndex = rest.indexOf('\n\n');
  while (separatorIndex !== -1) {
    const event = parseEventBlock(rest.slice(0, separatorIndex));
    if (event) {
      events.push(event);
    }
    rest = rest.slice(separatorIndex + 2);
    separatorIndex = rest.indexOf('\n\n');
  }

  return { events, rest };
};

export type SSEParser = {
  /**
   * バイト列チャンクを流し込み、そのチャンクまでで完成したイベント列を得る。
   * マルチバイト文字がチャンク境界で分断されても `TextDecoder` の
   * ストリーミングデコードで正しく連結される。
   */
  push: (chunk: Uint8Array) => SSEEvent[];
};

/**
 * バイト列を受け取る逐次パーサを生成する。
 *
 * `TextDecoder` は Expo の WinterCG 互換ランタイム(expo/src/winter/runtime.native.ts)が
 * グローバルへ導入するため、Hermes 上でもそのまま利用できる。
 */
export const createSSEParser = (): SSEParser => {
  const decoder = new TextDecoder('utf-8');
  let pending = '';

  return {
    push: (chunk: Uint8Array): SSEEvent[] => {
      const { events, rest } = parseSSEChunk(
        pending,
        decoder.decode(chunk, { stream: true })
      );
      pending = rest;
      return events;
    },
  };
};
