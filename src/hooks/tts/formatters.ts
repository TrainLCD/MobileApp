import type { Line, Station } from '../../@types/graphql';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import { wrapPhoneme } from '../../utils/phoneme';

/** 既存実装と同じ規則で sub alias を被せる。両方未指定なら 各駅停車 のフォールバック sub を返す。 */
export const replaceJapaneseText = (
  name: string | null | undefined,
  nameKatakana: string | null | undefined
): string => {
  if (!name && !nameKatakana) {
    return '<sub alias="かくえきていしゃ">各駅停車</sub>';
  }
  if (!nameKatakana) {
    return name ?? '';
  }
  return `<sub alias="${katakanaToHiragana(nameKatakana)}">${name}</sub>`;
};

const replaceLineNameJa = (line: Pick<Line, 'nameShort' | 'nameKatakana'>) =>
  replaceJapaneseText(line.nameShort, line.nameKatakana);

const replaceStationNameJa = (
  station: Pick<Station, 'name' | 'nameKatakana'>
) => replaceJapaneseText(station.name, station.nameKatakana);

/** 路線名を sub alias 付きで `、` 連結する。 */
export const formatLinesListJa = (lines: Line[]): string =>
  lines.map(replaceLineNameJa).join('、');

/** 駅名を sub alias 付きで `、` 連結する。 */
export const formatStationsListJa = (stations: Station[]): string =>
  stations.map(replaceStationNameJa).join('、');

/**
 * 路線名を `the A,<break time="200ms"/> the B,<break time="200ms"/> and the C` 形式で組み立てる。
 *
 * 末尾ピリオドは付けない。理由:
 * - TY / JR_KYUSHU は list を文中に埋め込む (`transfer to LIST, Please...` や `transfer to LIST at X.`) ため、
 *   ピリオドを足すと文法が壊れる
 * - YAMANOTE NEXT / SAIKYO NEXT / JR_KYUSHU ARRIVING は単数のときだけピリオドを落とす挙動 (※既知の不整合 #5914)
 * - 文末で使うテーマはテンプレ側で `.` を付与する
 */
export const formatLinesListEn = (lines: Line[]): string => {
  if (lines.length === 0) return '';
  if (lines.length === 1) {
    const l = lines[0];
    if (!l) return '';
    return `the ${wrapPhoneme(l.nameTtsSegments, l.nameRoman)}`;
  }
  const items = lines.map((l, i) => {
    const name = wrapPhoneme(l.nameTtsSegments, l.nameRoman);
    if (i === lines.length - 1) return `and the ${name}`;
    return `the ${name},<break time="200ms"/>`;
  });
  return items.join(' ');
};

/**
 * JR_WEST 用: `終点、X、Y、Z` 形式で先頭5駅を `、` 連結する。
 * 終着駅 (= selectedBound) と一致する駅には `終点、` を冠する。
 */
export const formatJrWestStopsListJa = (
  stops: Station[],
  isBoundStop: (s: Station) => boolean
): string =>
  stops
    .slice(0, 5)
    .map((s) =>
      isBoundStop(s)
        ? `終点、${replaceStationNameJa(s)}`
        : replaceStationNameJa(s)
    )
    .join('、');

/**
 * JR_WEST 用 (英語): `X, Y terminal, Z` 形式で先頭5駅を `, ` 連結する。
 * 終着駅には末尾に ` terminal` を付与する。
 */
export const formatJrWestStopsListEn = (
  stops: Station[],
  isBoundStop: (s: Station) => boolean
): string =>
  stops
    .slice(0, 5)
    .map((s) => {
      const name = wrapPhoneme(s.nameTtsSegments, s.nameRoman);
      return isBoundStop(s) ? `${name} terminal` : name;
    })
    .join(', ');

/** TY 用: 直通先1路線目のみを `on the X` 形式に整形する。該当がなければ空文字。 */
export const formatFirstConnectedLineEnPhrase = (lines: Line[]): string => {
  const first = lines[0];
  if (!first?.nameTtsSegments?.length) return '';
  return `on the ${wrapPhoneme(first.nameTtsSegments, first.nameRoman)}`;
};
