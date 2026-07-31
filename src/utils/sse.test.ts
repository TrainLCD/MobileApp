import { createSSEParser, parseSSEChunk } from './sse';

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('parseSSEChunk', () => {
  it('event と data の組を 1 イベントとして取り出す', () => {
    const { events, rest } = parseSSEChunk(
      '',
      'event: delta\ndata: {"text":"こん"}\n\n'
    );

    expect(events).toEqual([{ event: 'delta', data: '{"text":"こん"}' }]);
    expect(rest).toBe('');
  });

  it('1 チャンクに含まれる複数イベントを順番に取り出す', () => {
    const { events } = parseSSEChunk(
      '',
      'event: delta\ndata: {"text":"a"}\n\nevent: delta\ndata: {"text":"b"}\n\nevent: done\ndata: {"reply":"ab"}\n\n'
    );

    expect(events.map((event) => event.event)).toEqual([
      'delta',
      'delta',
      'done',
    ]);
    expect(events[2].data).toBe('{"reply":"ab"}');
  });

  it('複数行の data は改行で連結する', () => {
    const { events } = parseSSEChunk(
      '',
      'event: done\ndata: {\ndata: "a":1}\n\n'
    );

    expect(events).toEqual([{ event: 'done', data: '{\n"a":1}' }]);
  });

  it('コメント行(: 始まり)は無視する', () => {
    const { events } = parseSSEChunk(
      '',
      ': keep-alive\n\nevent: delta\ndata: {"text":"a"}\n\n'
    );

    expect(events).toEqual([{ event: 'delta', data: '{"text":"a"}' }]);
  });

  it('event 行が無い場合は既定のイベント名 message を使う', () => {
    const { events } = parseSSEChunk('', 'data: hello\n\n');

    expect(events).toEqual([{ event: 'message', data: 'hello' }]);
  });

  it('id や retry など解釈しないフィールドは読み飛ばす', () => {
    const { events } = parseSSEChunk(
      '',
      'id: 1\nretry: 3000\nevent: tool\ndata: {}\n\n'
    );

    expect(events).toEqual([{ event: 'tool', data: '{}' }]);
  });

  it('コロン直後の空白は 1 文字だけ取り除く', () => {
    const { events } = parseSSEChunk('', 'event: delta\ndata:  leading\n\n');

    expect(events).toEqual([{ event: 'delta', data: ' leading' }]);
  });

  it('CRLF 区切りも解釈する', () => {
    const { events } = parseSSEChunk(
      '',
      'event: delta\r\ndata: {"text":"a"}\r\n\r\n'
    );

    expect(events).toEqual([{ event: 'delta', data: '{"text":"a"}' }]);
  });

  it('未完のイベントは rest へ持ち越して次のチャンクで解釈する', () => {
    const first = parseSSEChunk('', 'event: delta\ndata: {"te');
    expect(first.events).toEqual([]);
    expect(first.rest).toBe('event: delta\ndata: {"te');

    const second = parseSSEChunk(first.rest, 'xt":"a"}\n\n');
    expect(second.events).toEqual([{ event: 'delta', data: '{"text":"a"}' }]);
    expect(second.rest).toBe('');
  });

  it('区切りの空行だけが次チャンクに来る場合も取りこぼさない', () => {
    const first = parseSSEChunk('', 'event: done\ndata: {}\n');
    expect(first.events).toEqual([]);

    const second = parseSSEChunk(first.rest, '\n');
    expect(second.events).toEqual([{ event: 'done', data: '{}' }]);
  });
});

describe('createSSEParser', () => {
  it('イベント途中で分割されたバイト列を結合して解釈する', () => {
    const parser = createSSEParser();
    const payload =
      'event: delta\ndata: {"text":"a"}\n\nevent: done\ndata: {}\n\n';
    const bytes = encode(payload);

    const events = [
      ...parser.push(bytes.slice(0, 10)),
      ...parser.push(bytes.slice(10, 33)),
      ...parser.push(bytes.slice(33)),
    ];

    expect(events).toEqual([
      { event: 'delta', data: '{"text":"a"}' },
      { event: 'done', data: '{}' },
    ]);
  });

  it('マルチバイト文字の途中で分割されても文字化けしない', () => {
    const parser = createSSEParser();
    const bytes = encode('event: delta\ndata: {"text":"海が見える"}\n\n');
    // 「海」(3 バイト)の途中に当たる位置で分割する
    const splitAt = encode('event: delta\ndata: {"text":"').length + 1;

    const events = [
      ...parser.push(bytes.slice(0, splitAt)),
      ...parser.push(bytes.slice(splitAt)),
    ];

    expect(events).toEqual([{ event: 'delta', data: '{"text":"海が見える"}' }]);
  });

  it('1 バイトずつ流し込んでも全イベントを復元できる', () => {
    const parser = createSSEParser();
    const bytes = encode(
      'event: delta\ndata: {"text":"あ"}\n\nevent: delta\ndata: {"text":"い"}\n\n'
    );

    const events = Array.from(bytes).flatMap((byte) =>
      parser.push(new Uint8Array([byte]))
    );

    expect(events).toEqual([
      { event: 'delta', data: '{"text":"あ"}' },
      { event: 'delta', data: '{"text":"い"}' },
    ]);
  });

  it('未完のまま終わったイベントは返さない', () => {
    const parser = createSSEParser();

    expect(parser.push(encode('event: delta\ndata: {"text":"a"}\n'))).toEqual(
      []
    );
  });
});
