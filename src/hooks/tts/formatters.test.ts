import type { Line } from '~/@types/graphql';
import { TtsAlphabet } from '~/@types/graphql';
import {
  formatFirstConnectedLineEnPhrase,
  replaceJapaneseText,
} from './formatters';

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
