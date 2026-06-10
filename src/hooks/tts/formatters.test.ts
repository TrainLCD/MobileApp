import type { Line, Station } from '~/@types/graphql';
import { TtsAlphabet } from '~/@types/graphql';
import {
  dedupeLinesByTtsName,
  formatFirstConnectedLineEnPhrase,
  formatJrWestStopsListEn,
  replaceJapaneseText,
  stripParensForTTS,
  stripStationParensForTTS,
} from './formatters';

afterEach(() => {
  jest.clearAllMocks();
});

describe('replaceJapaneseText', () => {
  it('returns empty string when both name and nameKatakana are nullish', () => {
    expect(replaceJapaneseText(null, null)).toBe('');
    expect(replaceJapaneseText(undefined, undefined)).toBe('');
    expect(replaceJapaneseText(null, undefined)).toBe('');
    expect(replaceJapaneseText('', '')).toBe('');
  });

  it('returns the provided fallback when both args are nullish', () => {
    expect(replaceJapaneseText(null, null, '各駅停車')).toBe('各駅停車');
    expect(
      replaceJapaneseText(
        undefined,
        undefined,
        '<sub alias="かくえきていしゃ">各駅停車</sub>'
      )
    ).toBe('<sub alias="かくえきていしゃ">各駅停車</sub>');
  });

  it('returns name without sub alias when only name is provided', () => {
    expect(replaceJapaneseText('新宿', null)).toBe('新宿');
    expect(replaceJapaneseText('新宿', undefined)).toBe('新宿');
  });

  it('wraps name with sub alias when both name and nameKatakana are provided', () => {
    expect(replaceJapaneseText('新宿', 'シンジュク')).toBe(
      '<sub alias="しんじゅく">新宿</sub>'
    );
  });

  it('does not fall back to 各駅停車 implicitly (#5917)', () => {
    // 駅名・路線名のヘルパとして使われるため、誤って `各駅停車` を返してはならない。
    expect(replaceJapaneseText(null, null)).not.toContain('各駅停車');
  });

  it('returns fallback when name is nullish but nameKatakana is provided', () => {
    // 以前は sub 内に `null` / `undefined` が混入していた。
    expect(replaceJapaneseText(null, 'シンジュク')).toBe('');
    expect(replaceJapaneseText(undefined, 'シンジュク')).toBe('');
    expect(replaceJapaneseText(null, 'シンジュク', '各駅停車')).toBe(
      '各駅停車'
    );

    // 念のため null / undefined の文字列が混入していないことも確認
    expect(replaceJapaneseText(null, 'シンジュク')).not.toContain('null');
    expect(replaceJapaneseText(undefined, 'シンジュク')).not.toContain(
      'undefined'
    );
  });
});

const makeLine = (overrides: Partial<Line>): Line =>
  ({
    __typename: 'Line',
    id: 1,
    nameShort: '',
    nameKatakana: '',
    nameFull: '',
    nameTtsSegments: null,
    nameRoman: null,
    ...overrides,
  }) as Line;

describe('dedupeLinesByTtsName', () => {
  it('returns the same array reference when length <= 1', () => {
    const empty: Line[] = [];
    expect(dedupeLinesByTtsName(empty)).toBe(empty);

    const single = [makeLine({ id: 1, nameShort: 'A' })];
    expect(dedupeLinesByTtsName(single)).toBe(single);
  });

  it('removes later lines whose nameShort already appeared', () => {
    // 博多駅の方面別 鹿児島本線 を模した重複ケース。
    const lines = [
      makeLine({
        id: 11,
        nameShort: '鹿児島本線',
        nameRoman: 'Kagoshima Line',
      }),
      makeLine({
        id: 12,
        nameShort: '鹿児島本線',
        nameRoman: 'Kagoshima Line',
      }),
      makeLine({
        id: 13,
        nameShort: '福北ゆたか線',
        nameRoman: 'Fukuhoku Yutaka Line',
      }),
    ];
    const result = dedupeLinesByTtsName(lines);
    expect(result.map((l) => l.id)).toEqual([11, 13]);
  });

  it('preserves the first occurrence order', () => {
    const lines = [
      makeLine({ id: 1, nameShort: 'A' }),
      makeLine({ id: 2, nameShort: 'B' }),
      makeLine({ id: 3, nameShort: 'A' }),
      makeLine({ id: 4, nameShort: 'C' }),
    ];
    const result = dedupeLinesByTtsName(lines);
    expect(result.map((l) => l.id)).toEqual([1, 2, 4]);
  });

  it('falls back to nameRoman when nameShort is missing', () => {
    const lines = [
      makeLine({ id: 1, nameShort: null, nameRoman: 'Foo Line' }),
      makeLine({ id: 2, nameShort: null, nameRoman: 'Foo Line' }),
    ];
    expect(dedupeLinesByTtsName(lines).map((l) => l.id)).toEqual([1]);
  });

  it('keeps lines with no usable key (does not collapse all nameless lines)', () => {
    const lines = [
      makeLine({ id: 1, nameShort: null, nameRoman: null }),
      makeLine({ id: 2, nameShort: null, nameRoman: null }),
    ];
    expect(dedupeLinesByTtsName(lines).map((l) => l.id)).toEqual([1, 2]);
  });
});

describe('formatFirstConnectedLineEnPhrase', () => {
  it('returns empty when lines is empty', () => {
    expect(formatFirstConnectedLineEnPhrase([])).toBe('');
  });

  it('renders the phrase from nameTtsSegments when available', () => {
    const line = makeLine({
      nameTtsSegments: [
        {
          __typename: 'TtsSegment',
          alphabet: TtsAlphabet.Plain,
          fallbackText: null,
          lang: null,
          pronunciation: null,
          separator: null,
          surface: 'Tokyu Toyoko Line',
        },
      ],
      nameRoman: 'Tokyu Toyoko Line',
    });
    expect(formatFirstConnectedLineEnPhrase([line])).toBe(
      'on the Tokyu Toyoko Line'
    );
  });

  it('falls back to nameRoman when nameTtsSegments is empty (#5917)', () => {
    const line = makeLine({
      nameTtsSegments: [],
      nameRoman: 'Tokyu Toyoko Line',
    });
    expect(formatFirstConnectedLineEnPhrase([line])).toBe(
      'on the Tokyu Toyoko Line'
    );
  });

  it('falls back to nameRoman when nameTtsSegments is null', () => {
    const line = makeLine({
      nameTtsSegments: null,
      nameRoman: 'Tokyu Toyoko Line',
    });
    expect(formatFirstConnectedLineEnPhrase([line])).toBe(
      'on the Tokyu Toyoko Line'
    );
  });

  it('returns empty when both nameTtsSegments and nameRoman are missing', () => {
    const line = makeLine({
      nameTtsSegments: null,
      nameRoman: null,
    });
    expect(formatFirstConnectedLineEnPhrase([line])).toBe('');
  });
});

describe('formatJrWestStopsListEn', () => {
  const makeStop = (id: number, nameRoman: string): Station =>
    ({
      __typename: 'Station',
      id,
      groupId: id,
      nameTtsSegments: null,
      nameRoman,
    }) as Station;

  it('joins stops with an Oxford comma style "and" (official JR-West wording)', () => {
    const stops = [
      makeStop(1, 'Tofukuji'),
      makeStop(2, 'Rokujizo'),
      makeStop(3, 'Uji'),
    ];
    expect(formatJrWestStopsListEn(stops, () => false)).toBe(
      'Tofukuji, Rokujizo, and Uji'
    );
  });

  it('moves the bound stop to a "before arriving at" clause', () => {
    const stops = [
      makeStop(1, 'Joyo'),
      makeStop(2, 'Tamamizu'),
      makeStop(3, 'Kizu'),
      makeStop(4, 'Nara'),
    ];
    expect(formatJrWestStopsListEn(stops, (s) => s.id === 4)).toBe(
      'Joyo, Tamamizu, and Kizu before arriving at Nara'
    );
  });

  it('joins two stops with a plain "and" (no serial comma)', () => {
    const stops = [makeStop(1, 'Tofukuji'), makeStop(2, 'Rokujizo')];
    expect(formatJrWestStopsListEn(stops, () => false)).toBe(
      'Tofukuji and Rokujizo'
    );
  });

  it('handles a two-stop batch ending at the bound stop', () => {
    const stops = [makeStop(1, 'Kizu'), makeStop(2, 'Nara')];
    expect(formatJrWestStopsListEn(stops, (s) => s.id === 2)).toBe(
      'Kizu before arriving at Nara'
    );
  });

  it('slices the batch to the first five stops', () => {
    const stops = [
      makeStop(1, 'A'),
      makeStop(2, 'B'),
      makeStop(3, 'C'),
      makeStop(4, 'D'),
      makeStop(5, 'E'),
      makeStop(6, 'F'),
    ];
    expect(formatJrWestStopsListEn(stops, () => false)).toBe(
      'A, B, C, D, and E'
    );
  });
});

describe('stripParensForTTS', () => {
  it('removes half-width parentheses and their contents', () => {
    expect(stripParensForTTS('電鉄富山(トヨタモビリティ富山)')).toBe(
      '電鉄富山'
    );
  });

  it('removes full-width parentheses and their contents', () => {
    expect(stripParensForTTS('電鉄富山（トヨタモビリティ富山）')).toBe(
      '電鉄富山'
    );
  });

  it('removes multiple parenthesised groups in a single string', () => {
    expect(stripParensForTTS('A(b)C（d）E')).toBe('ACE');
  });

  it('collapses leftover whitespace and trims edges', () => {
    expect(stripParensForTTS('A (b)  C')).toBe('A C');
    expect(stripParensForTTS('Dentetsu-Toyama (Toyota Mobility)')).toBe(
      'Dentetsu-Toyama'
    );
  });

  it('passes through values without parentheses untouched', () => {
    expect(stripParensForTTS('新宿')).toBe('新宿');
  });

  it('preserves null and undefined inputs', () => {
    expect(stripParensForTTS(null)).toBeNull();
    expect(stripParensForTTS(undefined)).toBeUndefined();
  });
});

describe('stripStationParensForTTS', () => {
  const baseStation: Station = {
    __typename: 'Station',
    address: null,
    closedAt: null,
    distance: null,
    groupId: 1,
    hasTrainTypes: null,
    id: 1,
    latitude: null,
    line: null,
    lines: null,
    longitude: null,
    name: '電鉄富山(トヨタモビリティ富山)',
    nameChinese: null,
    nameIpa: null,
    nameKatakana: 'デンテツトヤマ(トヨタモビリティトヤマ)',
    nameKorean: null,
    nameRoman: 'Dentetsu-Toyama (Toyota Mobility Toyama)',
    nameRomanIpa: null,
    nameTtsSegments: [
      {
        __typename: 'TtsSegment',
        alphabet: TtsAlphabet.Plain,
        fallbackText: 'Dentetsu-Toyama (fallback)',
        lang: null,
        pronunciation: null,
        separator: null,
        surface: 'Dentetsu-Toyama (Toyota Mobility Toyama)',
      },
    ],
    openedAt: null,
    postalCode: null,
    prefectureId: null,
    stationNumbers: null,
    status: null,
    stopCondition: null,
    threeLetterCode: null,
    trainType: null,
    transportType: null,
  };

  it('strips parentheses from name / nameKatakana / nameRoman', () => {
    const stripped = stripStationParensForTTS(baseStation);
    expect(stripped.name).toBe('電鉄富山');
    expect(stripped.nameKatakana).toBe('デンテツトヤマ');
    expect(stripped.nameRoman).toBe('Dentetsu-Toyama');
  });

  it('strips parentheses from nameTtsSegments fields', () => {
    const stripped = stripStationParensForTTS(baseStation);
    expect(stripped.nameTtsSegments?.[0]?.surface).toBe('Dentetsu-Toyama');
    expect(stripped.nameTtsSegments?.[0]?.fallbackText).toBe('Dentetsu-Toyama');
  });

  it('preserves non-TTS fields like groupId and stationNumbers', () => {
    const stripped = stripStationParensForTTS({
      ...baseStation,
      stationNumbers: [
        {
          __typename: 'StationNumber',
          lineSymbol: 'T',
          lineSymbolColor: '#000',
          lineSymbolShape: 'ROUND',
          stationNumber: 'T-01',
        },
      ],
    });
    expect(stripped.groupId).toBe(1);
    expect(stripped.stationNumbers?.[0]?.stationNumber).toBe('T-01');
  });

  it('returns a new object without mutating the source', () => {
    const original = { ...baseStation };
    const stripped = stripStationParensForTTS(baseStation);
    expect(stripped).not.toBe(baseStation);
    expect(baseStation.name).toBe(original.name);
  });
});
