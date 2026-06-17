import type { Line, Station } from '~/@types/graphql';
import { formatLineNames, getOriginLine, getViaLines } from './trainTypeList';

afterEach(() => jest.clearAllMocks());

const createLine = (id: number, over: Partial<Line> = {}): Line =>
  ({
    __typename: 'Line',
    id,
    nameShort: `路線${id}`,
    nameRoman: `Line${id}`,
    ...over,
  }) as unknown as Line;

const createDestination = (line: Line | null): Station =>
  ({ __typename: 'Station', line }) as unknown as Station;

// 池袋 → 元町・中華街（みなとみらい線）を想定したモデル
const seibuIkebukuro = createLine(1, { nameShort: '西武池袋線' });
const tobuTojo = createLine(2, { nameShort: '東武東上線' });
const fukutoshin = createLine(3, { nameShort: '副都心線' });
const tokyu = createLine(4, { nameShort: '東急東横線' });
const minatomirai = createLine(5, { nameShort: 'みなとみらい線' });

describe('getOriginLine', () => {
  it('行先がlines後半にある場合は先頭（始発側）を起点路線とする', () => {
    // 西武池袋線経由（西武→副都心→東横→みなとみらい）
    const lines = [seibuIkebukuro, fukutoshin, tokyu, minatomirai];
    const result = getOriginLine(lines, seibuIkebukuro, {
      line: minatomirai,
    } as Station);
    expect(result.id).toBe(seibuIkebukuro.id);
  });

  it('経由路線が違っても起点路線を正しく出し分ける（東武東上線経由）', () => {
    // 東武東上線経由（東武→副都心→東横→みなとみらい）
    const lines = [tobuTojo, fukutoshin, tokyu, minatomirai];
    const result = getOriginLine(lines, seibuIkebukuro, {
      line: minatomirai,
    } as Station);
    // 選択中の line が西武でも、この種別の起点は東武東上線になる
    expect(result.id).toBe(tobuTojo.id);
  });

  it('linesが行先始まりの逆順なら末尾（始発側）を起点路線とする', () => {
    const lines = [minatomirai, tokyu, fukutoshin, tobuTojo];
    const result = getOriginLine(lines, seibuIkebukuro, {
      line: minatomirai,
    } as Station);
    expect(result.id).toBe(tobuTojo.id);
  });

  it('行先が無い場合は選択中の路線を返す', () => {
    const lines = [tobuTojo, fukutoshin, minatomirai];
    expect(getOriginLine(lines, seibuIkebukuro, null).id).toBe(
      seibuIkebukuro.id
    );
    expect(
      getOriginLine(lines, seibuIkebukuro, createDestination(null)).id
    ).toBe(seibuIkebukuro.id);
  });

  it('行先路線がlinesに含まれない場合は選択中の路線を返す', () => {
    const lines = [tobuTojo, fukutoshin];
    const unrelated = createLine(99);
    const result = getOriginLine(lines, seibuIkebukuro, {
      line: unrelated,
    } as Station);
    expect(result.id).toBe(seibuIkebukuro.id);
  });

  it('linesが空でも選択中の路線にフォールバックする', () => {
    const result = getOriginLine([], seibuIkebukuro, {
      line: minatomirai,
    } as Station);
    expect(result.id).toBe(seibuIkebukuro.id);
  });

  it('起点と行先が隣接する2路線でも先頭を起点とする', () => {
    const lines = [seibuIkebukuro, minatomirai];
    const result = getOriginLine(lines, seibuIkebukuro, {
      line: minatomirai,
    } as Station);
    expect(result.id).toBe(seibuIkebukuro.id);
  });
});

describe('getViaLines', () => {
  it('起点と行先の間の経由路線のみを返す', () => {
    const lines = [seibuIkebukuro, fukutoshin, tokyu, minatomirai];
    const result = getViaLines(lines, seibuIkebukuro, {
      line: minatomirai,
    } as Station);
    expect(result.map((l) => l.id)).toEqual([fukutoshin.id, tokyu.id]);
  });

  it('行先が無い場合は起点路線を除いた全路線を返す', () => {
    const lines = [seibuIkebukuro, fukutoshin, tokyu];
    const result = getViaLines(lines, seibuIkebukuro, null);
    expect(result.map((l) => l.id)).toEqual([fukutoshin.id, tokyu.id]);
  });

  it('行先路線がlinesに含まれない場合は起点路線を除いた全路線を返す', () => {
    const lines = [seibuIkebukuro, fukutoshin, tokyu];
    const unrelated = createLine(99);
    const result = getViaLines(lines, seibuIkebukuro, {
      line: unrelated,
    } as Station);
    expect(result.map((l) => l.id)).toEqual([fukutoshin.id, tokyu.id]);
  });

  it('起点と行先が同一路線の場合は起点より後ろの路線を返す', () => {
    const lines = [seibuIkebukuro, fukutoshin, tokyu, minatomirai];
    const result = getViaLines(lines, fukutoshin, {
      line: fukutoshin,
    } as Station);
    expect(result.map((l) => l.id)).toEqual([tokyu.id, minatomirai.id]);
  });

  it('起点が行先より後ろにある（逆順）場合も間の路線を返す', () => {
    // selected=東横(index2), 行先=西武(index0)
    const lines = [seibuIkebukuro, fukutoshin, tokyu, minatomirai];
    const result = getViaLines(lines, tokyu, {
      line: seibuIkebukuro,
    } as Station);
    expect(result.map((l) => l.id)).toEqual([fukutoshin.id]);
  });
});

describe('formatLineNames', () => {
  const co = (id: number, nameShort: string, nameEnglishShort: string) =>
    ({ id, nameShort, nameEnglishShort }) as unknown as Line['company'];

  it('全路線が同一会社なら個別表示する（重複は除去）', () => {
    const lines = [
      createLine(1, {
        nameShort: '西武池袋線',
        company: co(10, '西武', 'SEIBU'),
      }),
      createLine(2, {
        nameShort: '西武秩父線',
        company: co(10, '西武', 'SEIBU'),
      }),
    ];
    expect(formatLineNames(lines, true)).toBe('西武池袋線 西武秩父線');
  });

  it('連続する同一会社の路線を「〇〇線」にまとめる', () => {
    const lines = [
      createLine(1, { nameShort: '東上線', company: co(11, '東武', 'TOBU') }),
      createLine(2, { nameShort: '越生線', company: co(11, '東武', 'TOBU') }),
      createLine(3, {
        nameShort: '副都心線',
        company: co(20, 'メトロ', 'METRO'),
      }),
    ];
    expect(formatLineNames(lines, true)).toBe('東武線 副都心線');
  });

  it('英語表記ではカンマ区切り・「Line」表記になる', () => {
    const lines = [
      createLine(1, {
        nameRoman: 'Tojo Line',
        company: co(11, '東武', 'Tobu'),
      }),
      createLine(2, {
        nameRoman: 'Ogose Line',
        company: co(11, '東武', 'Tobu'),
      }),
      createLine(3, {
        nameRoman: 'Fukutoshin Line',
        company: co(20, 'メトロ', 'Metro'),
      }),
    ];
    expect(formatLineNames(lines, false)).toBe('Tobu Line, Fukutoshin Line');
  });

  it('会社情報が無い路線はまとめずに個別表示する', () => {
    const lines = [
      createLine(1, { nameShort: 'A線' }),
      createLine(2, { nameShort: 'B線' }),
    ];
    expect(formatLineNames(lines, true)).toBe('A線 B線');
  });
});
