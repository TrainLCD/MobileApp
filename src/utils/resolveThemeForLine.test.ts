import type { Line } from '~/@types/graphql';
import { YAMANOTE_LINE_ID } from '~/constants/line';
import { APP_THEME } from '~/models/Theme';
import { resolveThemeForLine } from './resolveThemeForLine';

const makeLine = (overrides: Partial<Line> & { id?: number | null }): Line => ({
  __typename: 'Line',
  id: null,
  averageDistance: null,
  color: null,
  company: null,
  lineSymbols: null,
  lineType: null,
  nameChinese: null,
  nameFull: null,
  nameIpa: null,
  nameKatakana: null,
  nameKorean: null,
  nameRoman: null,
  nameRomanIpa: null,
  nameShort: null,
  nameTtsSegments: null,
  station: null,
  status: null,
  trainType: null,
  transportType: null,
  ...overrides,
});

const makeCompany = (nameShort: string) => ({
  __typename: 'Company' as const,
  id: null,
  name: null,
  nameEnglishFull: null,
  nameEnglishShort: null,
  nameFull: null,
  nameKatakana: null,
  nameShort,
  railroadId: null,
  status: null,
  type: null,
  url: null,
});

describe('resolveThemeForLine', () => {
  it('nullの場合TOKYO_METROを返す', () => {
    expect(resolveThemeForLine(null)).toBe(APP_THEME.TOKYO_METRO);
  });

  it('山手線(11302)はYAMANOTEを返す', () => {
    expect(resolveThemeForLine(makeLine({ id: YAMANOTE_LINE_ID }))).toBe(
      APP_THEME.YAMANOTE
    );
  });

  it('埼京線(11321)はSAIKYOを返す', () => {
    expect(resolveThemeForLine(makeLine({ id: 11321 }))).toBe(APP_THEME.SAIKYO);
  });

  it('横須賀線(11308)はJOを返す', () => {
    expect(resolveThemeForLine(makeLine({ id: 11308 }))).toBe(APP_THEME.JO);
  });

  it('総武本線(11314)はJOを返す', () => {
    expect(resolveThemeForLine(makeLine({ id: 11314 }))).toBe(APP_THEME.JO);
  });

  it('常磐線各停(11344)はJLを返す', () => {
    expect(resolveThemeForLine(makeLine({ id: 11344 }))).toBe(APP_THEME.JL);
  });

  it('東京メトロの路線はTOKYO_METROを返す', () => {
    expect(
      resolveThemeForLine(
        makeLine({ id: 28001, company: makeCompany('東京メトロ') })
      )
    ).toBe(APP_THEME.TOKYO_METRO);
  });

  it('都営の路線はTOEIを返す', () => {
    expect(
      resolveThemeForLine(makeLine({ id: 99301, company: makeCompany('都営') }))
    ).toBe(APP_THEME.TOEI);
  });

  it('都営地下鉄の路線もTOEIを返す', () => {
    expect(
      resolveThemeForLine(
        makeLine({ id: 99302, company: makeCompany('都営地下鉄') })
      )
    ).toBe(APP_THEME.TOEI);
  });

  it('JR西日本の路線はJR_WESTを返す', () => {
    expect(
      resolveThemeForLine(
        makeLine({ id: 11601, company: makeCompany('JR西日本') })
      )
    ).toBe(APP_THEME.JR_WEST);
  });

  it('東急の路線はTYを返す', () => {
    expect(
      resolveThemeForLine(makeLine({ id: 26001, company: makeCompany('東急') }))
    ).toBe(APP_THEME.TY);
  });

  it('JR九州の路線はJR_KYUSHUを返す', () => {
    expect(
      resolveThemeForLine(
        makeLine({ id: 11901, company: makeCompany('JR九州') })
      )
    ).toBe(APP_THEME.JR_KYUSHU);
  });

  it('みなとみらい線(99310)はTYを返す', () => {
    expect(
      resolveThemeForLine(
        makeLine({ id: 99310, company: makeCompany('横浜高速鉄道') })
      )
    ).toBe(APP_THEME.TY);
  });

  it('不明な路線はTOKYO_METROにフォールバックする', () => {
    expect(
      resolveThemeForLine(
        makeLine({ id: 99999, company: makeCompany('不明な会社') })
      )
    ).toBe(APP_THEME.TOKYO_METRO);
  });

  it('Line IDのマッピングはCompanyより優先される', () => {
    // 山手線はJR東日本だが、company matchではなくline ID matchでYAMANOTEになる
    expect(
      resolveThemeForLine(
        makeLine({ id: YAMANOTE_LINE_ID, company: makeCompany('JR東日本') })
      )
    ).toBe(APP_THEME.YAMANOTE);
  });
});
