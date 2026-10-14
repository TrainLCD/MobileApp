import type { Line, Station, TrainType } from '~/@types/graphql';
import {
  buildTrainTypeRow,
  formatLineNames,
  getBoardingLine,
  getBoardingLineStation,
  getOriginLine,
  getViaLines,
} from './trainTypeList';

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

// 乗車駅(StationNested)を模したヘルパー。lines[].station.stationNumbers から
// ナンバリングを引くため、各路線に駅番号付きの station を持たせる。
const createNestedStation = (stationNumber: string, lineSymbol: string) =>
  ({
    __typename: 'StationNested',
    stationNumbers: [{ stationNumber, lineSymbol }],
  }) as unknown as Line['station'];

const createBoardingStation = (
  lineEntries: { id: Line['id']; station?: Line['station'] }[]
): Station =>
  ({
    __typename: 'Station',
    lines: lineEntries,
  }) as unknown as Station;

describe('getBoardingLine', () => {
  // 西武秩父線・東急東横線・みなとみらい線は池袋を通らない（乗車駅に含まれない）
  const seibuChichibu = createLine(6, { nameShort: '西武秩父線' });
  const ikebukuro = createBoardingStation([
    { id: seibuIkebukuro.id },
    { id: tobuTojo.id },
    { id: fukutoshin.id },
  ]);

  it('経路順で最初に乗車駅を通る路線を乗車路線とする（S-TRAIN: 終端は西武秩父線でも乗車は西武池袋線）', () => {
    const lines = [
      seibuChichibu,
      seibuIkebukuro,
      fukutoshin,
      tokyu,
      minatomirai,
    ];
    const result = getBoardingLine(lines, ikebukuro, seibuIkebukuro, {
      line: minatomirai,
    } as Station);
    expect(result.id).toBe(seibuIkebukuro.id);
  });

  it('linesが行先始まりの逆順でも乗車駅を通る路線を選ぶ（特急: 副都心線から乗車）', () => {
    const lines = [minatomirai, tokyu, fukutoshin, seibuChichibu];
    const result = getBoardingLine(lines, ikebukuro, seibuIkebukuro, {
      line: minatomirai,
    } as Station);
    expect(result.id).toBe(fukutoshin.id);
  });

  it('乗車駅情報が無い場合は getOriginLine（始発側終端）にフォールバックする', () => {
    const lines = [tobuTojo, fukutoshin, tokyu, minatomirai];
    const result = getBoardingLine(lines, null, seibuIkebukuro, {
      line: minatomirai,
    } as Station);
    expect(result.id).toBe(tobuTojo.id);
  });

  it('乗車駅にどの経路路線も含まれない場合も getOriginLine にフォールバックする', () => {
    const lines = [tobuTojo, tokyu, minatomirai];
    const onlyOtherLines = createBoardingStation([{ id: seibuIkebukuro.id }]);
    const result = getBoardingLine(lines, onlyOtherLines, seibuIkebukuro, {
      line: minatomirai,
    } as Station);
    expect(result.id).toBe(tobuTojo.id);
  });
});

describe('getBoardingLineStation', () => {
  const ikebukuro = createBoardingStation([
    { id: seibuIkebukuro.id, station: createNestedStation('SI-01', 'SI') },
    { id: fukutoshin.id, station: createNestedStation('F-09', 'F') },
  ]);

  it('乗車駅の乗車路線の駅（駅番号付き）を返す', () => {
    const result = getBoardingLineStation(
      ikebukuro,
      fukutoshin,
      seibuIkebukuro
    );
    expect(result?.stationNumbers?.[0]?.stationNumber).toBe('F-09');
  });

  it('乗車駅情報が無く乗車路線が選択中の路線と同じなら選択路線の駅を返す', () => {
    const selected = createLine(1, {
      nameShort: '西武池袋線',
      station: createNestedStation('SI-01', 'SI'),
    } as Partial<Line>);
    const result = getBoardingLineStation(null, selected, selected);
    expect(result?.stationNumbers?.[0]?.stationNumber).toBe('SI-01');
  });

  it('乗車駅情報が無く乗車路線が選択中の路線と異なる場合は null を返す', () => {
    const result = getBoardingLineStation(null, fukutoshin, seibuIkebukuro);
    expect(result).toBeNull();
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

describe('buildTrainTypeRow', () => {
  const seibuChichibu = createLine(6, { nameShort: '西武秩父線' });
  // 池袋。西武池袋線・東武東上線・副都心線が乗り入れる
  const ikebukuro = createBoardingStation([
    { id: seibuIkebukuro.id, station: createNestedStation('SI-01', 'SI') },
    { id: tobuTojo.id, station: createNestedStation('TJ-01', 'TJ') },
    { id: fukutoshin.id, station: createNestedStation('F-09', 'F') },
  ]);
  const minatomiraiStation = { line: minatomirai } as Station;

  const createTrainType = (
    id: number,
    name: string,
    lines: Line[]
  ): TrainType =>
    ({
      __typename: 'TrainType',
      id,
      name,
      nameRoman: name,
      lines,
    }) as unknown as TrainType;

  // 西武池袋線経由と東武東上線経由。従来は行ごとに乗車路線が変わっていた
  const viaSeibu = createTrainType(1, '快速急行', [
    seibuChichibu,
    seibuIkebukuro,
    fukutoshin,
    tokyu,
    minatomirai,
  ]);
  const viaTobu = createTrainType(2, '急行', [
    tobuTojo,
    fukutoshin,
    tokyu,
    minatomirai,
  ]);

  it('経路検索ではカードの路線を各経路の乗車路線にする', () => {
    const rows = [viaSeibu, viaTobu].map((tt) =>
      buildTrainTypeRow(tt, seibuIkebukuro, ikebukuro, minatomiraiStation, true)
    );
    expect(rows.map((r) => r.cardLine.id)).toEqual([
      seibuIkebukuro.id,
      tobuTojo.id,
    ]);
  });

  it('経路検索のナンバリングも各経路の乗車路線で揃う', () => {
    const rows = [viaSeibu, viaTobu].map((tt) =>
      buildTrainTypeRow(tt, seibuIkebukuro, ikebukuro, minatomiraiStation, true)
    );
    expect(
      rows.map((r) => r.cardLineStation?.stationNumbers?.[0]?.stationNumber)
    ).toEqual(['SI-01', 'TJ-01']);
  });

  it('行先のない通常の種別選択では選択路線のデザインを保つ', () => {
    const rows = [viaSeibu, viaTobu].map((tt) =>
      buildTrainTypeRow(tt, seibuIkebukuro, ikebukuro, null, true)
    );
    expect(rows.map((row) => row.cardLine.id)).toEqual([
      seibuIkebukuro.id,
      seibuIkebukuro.id,
    ]);
    expect(
      rows.map((row) => row.cardLineStation?.stationNumbers?.[0]?.stationNumber)
    ).toEqual(['SI-01', 'SI-01']);
  });

  it('副都心線の経路カードでは代表名の普通ではなく急行と表示する', () => {
    const expressLine = createLine(fukutoshin.id ?? 0, {
      trainType: { groupId: 500, name: '急行', nameRoman: 'Express' },
    } as Partial<Line>);
    const tt = {
      ...createTrainType(4, '普通', [expressLine, tokyu]),
      groupId: 500,
    };
    const row = buildTrainTypeRow(
      tt,
      seibuIkebukuro,
      ikebukuro,
      createDestination(tokyu),
      true
    );
    expect(row.title).toBe('急行');
    expect(row.searchText).toContain('急行');
    expect(row.trainType).toBe(tt);
    expect(
      buildTrainTypeRow(
        tt,
        seibuIkebukuro,
        ikebukuro,
        createDestination(tokyu),
        false
      ).title
    ).toBe('Express');
  });

  it('丸ノ内線が選択中でも湘南新宿ラインの色・記号・番号を使う', () => {
    const metro = createLine(28002, {
      color: '#f62e36',
      lineSymbols: [
        {
          __typename: 'LineSymbol',
          symbol: 'M',
          color: '#f62e36',
          shape: 'ROUND',
        },
      ],
    });
    const shonan = createLine(11333, {
      color: '#f68b1e',
      lineSymbols: [
        {
          __typename: 'LineSymbol',
          symbol: 'JS',
          color: '#f68b1e',
          shape: 'SQUARE',
        },
      ],
    });
    const boarding = createBoardingStation([
      { id: metro.id, station: createNestedStation('M-25', 'M') },
      { id: shonan.id, station: createNestedStation('JS-21', 'JS') },
    ]);
    const row = buildTrainTypeRow(
      createTrainType(3, '特別快速', [shonan]),
      metro,
      boarding,
      createDestination(shonan),
      true
    );
    expect(row.cardLine.color).toBe(shonan.color);
    expect(row.cardLine.lineSymbols?.[0]?.symbol).toBe('JS');
    expect(row.cardLineStation?.stationNumbers?.[0]?.stationNumber).toBe(
      'JS-21'
    );
  });

  it('乗換経路では乗車駅が後の区間の路線も持っていても最初の路線を使う', () => {
    const row = buildTrainTypeRow(
      createTrainType(-1, '普通', [seibuIkebukuro, tobuTojo]),
      fukutoshin,
      createBoardingStation([
        { id: tobuTojo.id, station: createNestedStation('TJ-01', 'TJ') },
      ]),
      createDestination(tobuTojo),
      true
    );
    expect(row.cardLine.id).toBe(seibuIkebukuro.id);
    expect(row.cardLineStation).toBeNull();
  });

  it('経由路線は種別ごとの乗車路線を起点に切り出したままにする', () => {
    const row = buildTrainTypeRow(
      viaTobu,
      seibuIkebukuro,
      ikebukuro,
      minatomiraiStation,
      true
    );
    // 乗車路線(東武東上線)は経由に含めず、そこから行先までの間だけを出す
    expect(row.viaLines.map((l) => l.id)).toEqual([fukutoshin.id, tokyu.id]);
  });
});

describe('transfer rows preserve repeated lines and ride order', () => {
  it.each([true, false])(
    'keeps individual line names and repeated segments within a service (ja=%s)',
    (ja) => {
      const service = {
        typeId: 2,
        groupId: 200,
        name: '快速',
        nameRoman: 'Rapid',
      };
      const boardingLine = createLine(9);
      const tojo = createLine(1, {
        nameShort: '東上線',
        nameRoman: 'Tojo Line',
        company: { id: 11, nameShort: '東武', nameEnglishShort: 'Tobu' },
        trainType: service,
      } as Partial<Line>);
      const ogose = createLine(2, {
        nameShort: '越生線',
        nameRoman: 'Ogose Line',
        company: tojo.company,
        trainType: service,
      } as Partial<Line>);
      const metro = createLine(3, {
        nameShort: '副都心線',
        nameRoman: 'Fukutoshin Line',
        company: { id: 20, nameShort: 'メトロ', nameEnglishShort: 'Metro' },
        trainType: service,
      } as Partial<Line>);

      // Both all-one-company deduplication and mixed-company abbreviation
      // used to lose this route's individual segments in the subtitle.
      for (const viaLines of [
        [tojo, ogose, tojo],
        [tojo, ogose, tojo, metro],
      ]) {
        const trainType = {
          id: -1,
          name: '各駅停車',
          nameRoman: 'Local',
          lines: [boardingLine, ...viaLines],
        } as TrainType;
        const row = buildTrainTypeRow(trainType, boardingLine, null, null, ja);
        const expectedNames = ja
          ? '東上線 越生線 東上線'
          : 'Tojo Line, Ogose Line, Tojo Line';
        const lastName =
          viaLines.length === 4 ? (ja ? ' 副都心線' : ', Fukutoshin Line') : '';
        expect(row.subtitle).toBe(
          `${expectedNames}${lastName} ${ja ? '快速' : 'Rapid'}`
        );
        expect(row.viaLines).toEqual(viaLines);
        expect(row.searchText).toContain('越生線');
        expect(row.searchText).toContain('ogose line');

        // A normal service still uses the existing compact company display.
        if (viaLines.length === 4) {
          const normalRow = buildTrainTypeRow(
            { ...trainType, id: 1 },
            boardingLine,
            null,
            null,
            ja
          );
          expect(normalRow.subtitle).toBe(
            ja ? '東武線 副都心線 直通' : 'Via Tobu Line, Fukutoshin Line'
          );
        }
      }
    }
  );

  it('keeps later rides when the destination line appears earlier in the route', () => {
    const local = {
      typeId: 1,
      groupId: 100,
      name: '各駅停車',
      nameRoman: 'Local',
    };
    const rapid = { typeId: 2, groupId: 200, name: '快速', nameRoman: 'Rapid' };
    const lines = [
      createLine(1, { trainType: local } as Partial<Line>),
      createLine(2, { trainType: local } as Partial<Line>),
      createLine(1, { trainType: rapid } as Partial<Line>),
      createLine(2, { trainType: local } as Partial<Line>),
    ];
    const tt = {
      id: -1,
      name: '各駅停車',
      nameRoman: 'Local',
      lines,
    } as TrainType;
    const row = buildTrainTypeRow(
      tt,
      lines[0],
      null,
      createDestination(lines[3]),
      true
    );
    expect(
      row.viaLines.map((line) => [line.id, line.trainType?.groupId])
    ).toEqual([
      [2, 100],
      [1, 200],
      [2, 100],
    ]);
    expect(row.subtitle).toBe('路線2 各駅停車\n路線1 快速\n路線2 各駅停車');
  });
});
