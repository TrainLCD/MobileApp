import type { Line, Station, TtsSegment } from '../../@types/graphql';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import { escapeXml, escapeXmlAttr, wrapPhoneme } from '../../utils/phoneme';

// IPA のアクセント核（下げ核）マーカー。Azure は <phoneme alphabet="ipa"> 経由で
// この記号を尊重することを実機確認済み。StationAPI が nameIpa に付与する。
const ACCENT_NUCLEUS_MARK = 'ˈ';

// 駅名に併記されたカッコ書き (例: 命名権スポンサー名 `電鉄富山(トヨタモビリティ富山)`)
// を TTS で読み上げないために、半角・全角のカッコと中身を取り除く。
// 既存の `parenthesisRegexp` は半角のみで駅 API が全角を返すケースをカバー
// できないため、TTS パイプライン専用に別定義する (issue #1175)。
const ttsParensRegexp = /[（(][^（）()]*[）)]/g;

/**
 * TTS で読み上げる文字列からカッコ (半角・全角) と中身を取り除く。
 * 取り除いたあとに連続空白を 1 つに畳み、両端の空白も落として
 * `nameRoman` などで残る不自然な空白が読み上げに乗らないようにする。
 */
export const stripParensForTTS = <T extends string | null | undefined>(
  value: T
): T => {
  if (value == null) return value;
  return value
    .replace(ttsParensRegexp, '')
    .replace(/\s{2,}/g, ' ')
    .trim() as T;
};

const stripTtsSegmentParens = (seg: TtsSegment): TtsSegment => ({
  ...seg,
  surface: stripParensForTTS(seg.surface),
  fallbackText: stripParensForTTS(seg.fallbackText),
});

/**
 * Station の TTS 関連フィールド (name / nameKatakana / nameRoman /
 * nameTtsSegments) からカッコ書きを取り除いた新しい Station を返す。
 *
 * `<sub alias="...">name</sub>` のような SSML 構築前にこれを通すことで、
 * alias 側 (= 実際に読み上げられる読み) にもカッコ内のスポンサー名などが
 * 残らないようにする (issue #1175)。表示用データには影響しない。
 */
export const stripStationParensForTTS = (station: Station): Station => ({
  ...station,
  name: stripParensForTTS(station.name),
  nameKatakana: stripParensForTTS(station.nameKatakana),
  nameRoman: stripParensForTTS(station.nameRoman),
  nameTtsSegments: station.nameTtsSegments?.map(stripTtsSegmentParens),
});

/**
 * 既存実装と同じ規則で sub alias を被せる。
 * `name` が未指定なら `fallback` (デフォルト空文字) を返す。
 *
 * NOTE: 以前はヘルパ内で `各駅停車` を返していたが、駅名・路線名・会社名にも使われるため、
 * 値欠落時に `次は、各駅停車` のような無関係案内へ化ける問題があった (#5917)。
 * 各駅停車などの train type フォールバックが必要な呼び出し側は明示的に渡す。
 *
 * NOTE: `name` だけ nullish で `nameKatakana` が埋まっているケースでは sub 内に
 * `null` / `undefined` が混入していたため、`name` がない時点で fallback に倒す。
 */
export const replaceJapaneseText = (
  name: string | null | undefined,
  nameKatakana: string | null | undefined,
  nameIpa?: string | null | undefined,
  fallback = ''
): string => {
  if (!name) {
    return fallback;
  }
  // アクセント核(ˈ)を含む IPA がある場合のみ <phoneme> で読ませ、固有名詞の
  // ピッチアクセントを明示する。核が無い場合（StationAPI 未対応 or 平板）は
  // 従来どおり読み(<sub>)に倒すことで、アクセントデータ投入前は挙動を一切
  // 変えず（無リグレッション）、データ投入と同時に自動で有効化される。
  if (nameIpa?.includes(ACCENT_NUCLEUS_MARK)) {
    return `<phoneme alphabet="ipa" ph="${escapeXmlAttr(nameIpa)}">${escapeXml(name)}</phoneme>`;
  }
  if (!nameKatakana) {
    return name;
  }
  return `<sub alias="${katakanaToHiragana(nameKatakana)}">${name}</sub>`;
};

const replaceLineNameJa = (
  line: Pick<Line, 'nameShort' | 'nameKatakana' | 'nameIpa'>
) => replaceJapaneseText(line.nameShort, line.nameKatakana, line.nameIpa);

const replaceStationNameJa = (
  station: Pick<Station, 'name' | 'nameKatakana' | 'nameIpa'>
) => replaceJapaneseText(station.name, station.nameKatakana, station.nameIpa);

/** 路線名を sub alias 付きで `、` 連結する。 */
export const formatLinesListJa = (lines: Line[]): string =>
  lines.map(replaceLineNameJa).join('、');

/**
 * 同じ路線名が複数レコードに分かれて返ってくるケース (例: 博多駅の方面別
 * 鹿児島本線) で、TTS の乗換案内が同じ路線名を連続で読み上げるのを防ぐため、
 * `nameShort` (fallback で `nameRoman`) が一致する Line を最初の出現だけ残して
 * 間引く。表示用の経路は両方残したいので、TTS 直前のこの段でのみ適用する。
 * `useTransferLinesFromStation` が `nameShort` / `nameRoman` から既にカッコ書き
 * を取り除いているため、ここでは生の文字列比較で十分。
 */
export const dedupeLinesByTtsName = (lines: Line[]): Line[] => {
  if (lines.length <= 1) return lines;
  const seen = new Set<string>();
  const result: Line[] = [];
  for (const line of lines) {
    const key = line.nameShort ?? line.nameRoman ?? '';
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    result.push(line);
  }
  return result;
};

/** 駅名を sub alias 付きで `、` 連結する。 */
export const formatStationsListJa = (stations: Station[]): string =>
  stations.map(replaceStationNameJa).join('、');

/**
 * 路線名を `the A,<break time="200ms"/> the B,<break time="200ms"/> and the C` 形式で組み立てる。
 *
 * 末尾ピリオドは付けない。理由:
 * - TY / JR_KYUSHU は list を文中に埋め込む (`transfer to LIST, Please...` や `transfer to LIST at X.`) ため、
 *   ピリオドを足すと文法が壊れる
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
 * JR_WEST 用 (英語): 先頭5駅を `A, B, and C` 形式で連結する。
 * バッチ末尾が終着駅 (= selectedBound) の場合は終着駅を列挙から外し、
 * 公式放送 (みやこ路快速) と同じ `A, B, and C before arriving at X` 形式にする。
 */
export const formatJrWestStopsListEn = (
  stops: Station[],
  isBoundStop: (s: Station) => boolean
): string => {
  const joinWithAnd = (names: string[]): string => {
    if (names.length <= 1) return names[0] ?? '';
    // 2件のときにシリアルカンマを入れると `A, and B` と不自然になるため分岐する
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  };
  const batch = stops.slice(0, 5);
  const names = batch.map((s) => wrapPhoneme(s.nameTtsSegments, s.nameRoman));
  const last = batch[batch.length - 1];
  if (last && isBoundStop(last) && names.length > 1) {
    return `${joinWithAnd(names.slice(0, -1))} before arriving at ${names[names.length - 1]}`;
  }
  return joinWithAnd(names);
};

/**
 * TY 用: 直通先1路線目のみを `on the X` 形式に整形する。該当がなければ空文字。
 *
 * NOTE: 描画結果ベースで判定する。以前は `nameTtsSegments` の有無だけを見ていたため、
 * segments が空でも `nameRoman` のみ埋まっているケースで wrapPhoneme の fallback が
 * 効かず句が丸ごと消えていた (#5917)。
 */
export const formatFirstConnectedLineEnPhrase = (lines: Line[]): string => {
  const first = lines[0];
  if (!first) return '';
  const name = wrapPhoneme(first.nameTtsSegments, first.nameRoman);
  if (!name) return '';
  return `on the ${name}`;
};
