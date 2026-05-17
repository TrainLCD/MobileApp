// routeResolver pulls in react-native-device-info via ~/utils/isDevApp; the
// project-wide setupTests.ts isn't wired into jest.config, so we stub it
// locally to avoid the NativeEventEmitter invariant during module load.
jest.mock('react-native-device-info', () => ({
  getBundleId: jest.fn(() => 'me.tinykitten.trainlcd.dev'),
}));

import { resolveSidsFromShortId } from './routeResolver';

// Use a constant test host so assertions don't depend on what
// react-native-dotenv inlined from .env at babel transform time.
const TEST_HOST = 'https://resolver.example.test';

describe('resolveSidsFromShortId', () => {
  const setupFetch = (
    impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  ) => {
    const mockFetch = jest.fn(impl);
    // biome-ignore lint/suspicious/noExplicitAny: assigning global mock
    (global as any).fetch = mockFetch;
    return mockFetch;
  };

  afterEach(() => {
    // biome-ignore lint/suspicious/noExplicitAny: cleanup global fetch mock
    (global as any).fetch = undefined;
  });

  it('成功時にsidsを数値配列で返しresolver pathを叩く', async () => {
    const mockFetch = setupFetch(
      async () =>
        new Response(JSON.stringify({ sids: [1131211, 1131310, 2800217] }), {
          status: 200,
        })
    );

    const controller = new AbortController();
    const result = await resolveSidsFromShortId(
      'abc123',
      controller.signal,
      TEST_HOST
    );

    expect(result.stationIds).toEqual([1131211, 1131310, 2800217]);
    expect(result.skipIndices).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      `${TEST_HOST}/api/routes/abc123`,
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
    );
  });

  it('hostの末尾スラッシュを正規化する', async () => {
    const mockFetch = setupFetch(
      async () =>
        new Response(JSON.stringify({ sids: [1, 2] }), { status: 200 })
    );

    await resolveSidsFromShortId(
      'xyz',
      new AbortController().signal,
      `${TEST_HOST}///`
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${TEST_HOST}/api/routes/xyz`,
      expect.anything()
    );
  });

  it('文字列形式のsidsも数値として解決する', async () => {
    setupFetch(
      async () =>
        new Response(JSON.stringify({ sids: ['1131211', '1131310'] }), {
          status: 200,
        })
    );

    const result = await resolveSidsFromShortId(
      'abc',
      new AbortController().signal,
      TEST_HOST
    );

    expect(result.stationIds).toEqual([1131211, 1131310]);
    expect(result.skipIndices).toBeNull();
  });

  it('skipsが含まれている場合はskipIndicesに変換する', async () => {
    setupFetch(
      async () =>
        new Response(
          JSON.stringify({
            sids: [1131211, 1131310, 2800217, 2800218],
            skips: [1, 2],
          }),
          { status: 200 }
        )
    );

    const result = await resolveSidsFromShortId(
      'abc',
      new AbortController().signal,
      TEST_HOST
    );

    expect(result.stationIds).toEqual([1131211, 1131310, 2800217, 2800218]);
    expect(result.skipIndices).toBeInstanceOf(Set);
    expect(Array.from(result.skipIndices ?? [])).toEqual([1, 2]);
  });

  it('文字列形式のskipsも数値として解決する', async () => {
    setupFetch(
      async () =>
        new Response(
          JSON.stringify({
            sids: [1131211, 1131310, 2800217],
            skips: ['0', '2'],
          }),
          { status: 200 }
        )
    );

    const result = await resolveSidsFromShortId(
      'abc',
      new AbortController().signal,
      TEST_HOST
    );

    expect(Array.from(result.skipIndices ?? [])).toEqual([0, 2]);
  });

  it.each([
    ['skipsフィールドなし', { sids: [1, 2] }],
    ['skipsがnull', { sids: [1, 2], skips: null }],
    ['skipsが空配列', { sids: [1, 2], skips: [] }],
  ])('%sの場合はskipIndicesがnull', async (_label, payload) => {
    setupFetch(
      async () => new Response(JSON.stringify(payload), { status: 200 })
    );

    const result = await resolveSidsFromShortId(
      'abc',
      new AbortController().signal,
      TEST_HOST
    );

    expect(result.skipIndices).toBeNull();
  });

  it.each([
    ['配列でない', { sids: [1, 2], skips: 'not-array' }, /malformed skips/],
    ['負数を含む', { sids: [1, 2], skips: [-1] }, /non-integer skip/],
    ['小数を含む', { sids: [1, 2, 3], skips: [0.5] }, /non-integer skip/],
    ['末尾不正文字列', { sids: [1, 2, 3], skips: ['1x'] }, /non-integer skip/],
    ['範囲外', { sids: [1, 2], skips: [2] }, /out-of-range skip/],
    ['重複', { sids: [1, 2, 3], skips: [1, 1] }, /non-ascending skip/],
    ['非昇順', { sids: [1, 2, 3], skips: [2, 1] }, /non-ascending skip/],
  ])('skipsが%sの場合はエラーを投げる', async (_label, payload, expected) => {
    setupFetch(
      async () => new Response(JSON.stringify(payload), { status: 200 })
    );

    await expect(
      resolveSidsFromShortId('bad', new AbortController().signal, TEST_HOST)
    ).rejects.toThrow(expected as RegExp);
  });

  it('非okレスポンスでstatusを含むエラーを投げる', async () => {
    setupFetch(
      async () =>
        new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    );

    await expect(
      resolveSidsFromShortId('missing', new AbortController().signal, TEST_HOST)
    ).rejects.toThrow(/404/);
  });

  it('sidsが配列でない場合はエラーを投げる', async () => {
    setupFetch(
      async () =>
        new Response(JSON.stringify({ sids: 'not-an-array' }), { status: 200 })
    );

    await expect(
      resolveSidsFromShortId('bad', new AbortController().signal, TEST_HOST)
    ).rejects.toThrow(/malformed/);
  });

  it('sidsが2件未満の場合はエラーを投げる', async () => {
    setupFetch(
      async () =>
        new Response(JSON.stringify({ sids: [1131211] }), { status: 200 })
    );

    await expect(
      resolveSidsFromShortId('short', new AbortController().signal, TEST_HOST)
    ).rejects.toThrow(/malformed/);
  });

  it.each([
    ['負数', [1131211, -1]],
    ['ゼロ', [1131211, 0]],
    ['小数', [1131211, 1.5]],
    ['末尾不正の文字列', [1131211, '12abc']],
    ['null', [1131211, null]],
  ])('sidsに%sが含まれる場合はエラーを投げる', async (_label, sids) => {
    setupFetch(
      async () => new Response(JSON.stringify({ sids }), { status: 200 })
    );

    await expect(
      resolveSidsFromShortId('bad', new AbortController().signal, TEST_HOST)
    ).rejects.toThrow(/non-integer sid/);
  });

  it('fetchが例外を投げた場合はそのまま伝播する', async () => {
    setupFetch(async () => {
      throw new Error('network down');
    });

    await expect(
      resolveSidsFromShortId('net', new AbortController().signal, TEST_HOST)
    ).rejects.toThrow('network down');
  });
});
