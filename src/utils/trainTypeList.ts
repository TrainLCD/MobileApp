import uniqBy from 'lodash/uniqBy';
import type { Line, Station, StationNested, TrainType } from '~/@types/graphql';

/**
 * 各種別が始発（出発駅）で乗車する起点路線を lines から特定する。
 *
 * tt.line は行先側の路線が入るため使えない。lines はその種別が通る全路線が
 * 経路順に並ぶので、行先路線(destination.line)の反対側の端が始発側になる。
 * 行先が lines の後半にあれば先頭、前半にあれば末尾が起点路線。
 * 行先が不明（在来アプリ内での利用など）な場合は選択中の路線をそのまま返す。
 */
export const getOriginLine = (
  lines: Line[],
  selectedLine: Line,
  destination?: Station | null
): Line => {
  const destinationLineIndex =
    destination?.line?.id != null
      ? lines.findIndex((l) => l.id === destination.line?.id)
      : -1;

  if (destinationLineIndex === -1) {
    return selectedLine;
  }

  const originFromStart = destinationLineIndex * 2 >= lines.length - 1;
  return (originFromStart ? lines[0] : lines.at(-1)) ?? selectedLine;
};

/**
 * 乗車駅(boardingStation)で実際に乗車する路線を返す。
 *
 * 経路順に並ぶ lines のうち、乗車駅を通る最初の路線がその駅で乗車する路線になる。
 * getOriginLine が返す始発側の終端路線は、乗車駅が経路の途中にある場合（例: 池袋から
 * S-TRAIN に乗ると終端は西武秩父線だが乗車するのは西武池袋線）に一致しない。
 * 経由路線は「その駅で乗ってから先」を出したいので、この乗車路線を起点に切り出す。
 * 乗車駅情報が無い場合（在来アプリ内利用など）は getOriginLine にフォールバックする。
 */
export const getBoardingLine = (
  lines: Line[],
  boardingStation: Station | null | undefined,
  selectedLine: Line,
  destination?: Station | null
): Line =>
  lines.find((l) => boardingStation?.lines?.some((sl) => sl.id === l.id)) ??
  getOriginLine(lines, selectedLine, destination);

/**
 * 乗車駅における乗車路線(boardingLine)の駅（駅番号付き）を返す。ナンバリング表示に使う。
 *
 * 経路検索では item.lines[].station が API で null になるため、乗車駅の路線別 station
 * から乗車路線の駅を引く。乗車駅情報が無い場合は、乗車路線が選択中の路線と同じであれば
 * 選択路線の駅へフォールバックする（在来アプリ内利用など）。
 */
export const getBoardingLineStation = (
  boardingStation: Station | null | undefined,
  boardingLine: Line,
  selectedLine: Line
): StationNested | null =>
  boardingStation?.lines?.find((l) => l.id === boardingLine.id)?.station ??
  (boardingLine.id === selectedLine.id ? (selectedLine.station ?? null) : null);

/** 選択された路線と目的地の路線の間にある経由路線を取得する */
export const getViaLines = (
  lines: Line[],
  selectedLine: Line,
  destination?: Station | null
): Line[] => {
  const selectedLineIndex = lines.findIndex((l) => l.id === selectedLine.id);
  const linesWithoutCurrent = lines.filter((l) => l.id !== selectedLine.id);

  if (!destination) {
    return linesWithoutCurrent;
  }

  const destinationLineIndex = lines.findIndex(
    (l) => l.id === destination.line?.id
  );
  if (destinationLineIndex === -1) {
    return linesWithoutCurrent;
  }

  // 選択された路線と目的地の路線が同じ場合は、選択された路線より後の路線を表示
  if (selectedLineIndex === destinationLineIndex) {
    return lines.slice(selectedLineIndex + 1);
  }

  const start = Math.min(selectedLineIndex, destinationLineIndex);
  const end = Math.max(selectedLineIndex, destinationLineIndex);
  let segment = lines.slice(start + 1, end);
  if (selectedLineIndex > destinationLineIndex) {
    segment = [...segment].reverse();
  }
  return segment.filter((l) => l.id !== selectedLine.id);
};

/**
 * 同じ会社の連続する路線を「〇〇線」にまとめて表示する。
 * 全路線が同一会社の場合はまとめずに個別表示する。
 */
export const formatLineNames = (lines: Line[], ja: boolean): string => {
  const names = (l: Line) => (ja ? l.nameShort : l.nameRoman);
  const sep = ja ? ' ' : ', ';

  // 全路線が同一会社ならグルーピングせず個別表示
  const allSameCompany =
    lines.length > 1 &&
    lines[0]?.company?.id != null &&
    lines.every((l) => l.company?.id === lines[0]?.company?.id);

  if (allSameCompany) {
    return Array.from(new Set(lines.map(names)))
      .filter(Boolean)
      .join(sep);
  }

  // 連続する同一会社の路線をサブグループ化（companyがない場合はまとめない）
  const companyGroups = lines.reduce<Line[][]>((groups, l) => {
    const lastGroup = groups.at(-1);
    if (
      lastGroup &&
      lastGroup[0]?.company?.id != null &&
      lastGroup[0].company.id === l.company?.id
    ) {
      lastGroup.push(l);
    } else {
      groups.push([l]);
    }
    return groups;
  }, []);

  return companyGroups
    .map((group) => {
      if (group.length > 1) {
        const companyName = ja
          ? group[0]?.company?.nameShort
          : group[0]?.company?.nameEnglishShort;
        if (!companyName) {
          // Fallback to individual line names when company name is undefined
          return Array.from(new Set(group.map(names)))
            .filter(Boolean)
            .join(sep);
        }
        return ja ? `${companyName}線` : `${companyName} Line`;
      }
      return names(group[0]);
    })
    .filter(Boolean)
    .join(sep);
};

/** 種別一覧の 1 行分。表示に必要な値と、絞り込みに使う値をまとめて持つ */
export type TrainTypeRow = {
  trainType: TrainType;
  /** カードの配色・路線記号・ナンバリングに使う路線。全種別で共通 */
  cardLine: Line;
  /** ナンバリング表示に使うカード路線側の駅。全種別で共通 */
  cardLineStation: StationNested | null;
  /** カードの見出し（＝種別名）。種別での絞り込みのキーも兼ねる */
  title: string;
  /** カードの補足（経由・直通路線） */
  subtitle: string;
  /** 経由・直通路線。路線での絞り込みに使う */
  viaLines: Line[];
  /** 正規化済みの検索対象テキスト */
  searchText: string;
};

/**
 * 検索の突き合わせ用に文字列を正規化する。
 * 全角英数で入力されても半角の路線名・種別名に当たるよう NFKC で畳んでから小文字化する。
 */
export const normalizeSearchText = (text: string): string =>
  text.normalize('NFKC').toLowerCase();

/**
 * 種別 1 件から一覧の 1 行を組み立てる。
 *
 * 表示用の値と絞り込み用の値は同じ経由路線から導けるので、行ごとに一度だけ計算して
 * 使い回す。リストの描画のたびに経由路線を引き直さずに済む。
 */
export const buildTrainTypeRow = (
  trainType: TrainType,
  selectedLine: Line,
  boardingStation: Station | null | undefined,
  destination: Station | null | undefined,
  ja: boolean
): TrainTypeRow => {
  const lines = uniqBy(trainType.lines ?? [], 'id');

  // 経由路線は乗車駅で実際に乗車する路線から先を出したいので、種別ごとに乗車路線を
  // 求めて起点にする（経路の途中駅から乗る場合、終端路線は乗車路線と一致しない）。
  const boardingLine = getBoardingLine(
    lines,
    boardingStation,
    selectedLine,
    destination
  );
  const viaLines = getViaLines(lines, boardingLine, destination);
  const title = (ja ? trainType.name : trainType.nameRoman) ?? '';

  // 同じ種別の路線をグループ化（連続していなくても同じtypeIdなら同一グループ）
  const groupedViaLines = viaLines.reduce<Line[][]>((groups, l) => {
    const typeId = l.trainType?.typeId;
    const existingGroup =
      typeId !== null && typeId !== undefined
        ? groups.find((g) => g[0]?.trainType?.typeId === typeId)
        : undefined;
    if (existingGroup) {
      existingGroup.push(l);
    } else {
      groups.push([l]);
    }
    return groups;
  }, []);

  const isSingleGroup = groupedViaLines.length <= 1;

  const subtitle = isSingleGroup
    ? ja
      ? `${formatLineNames(viaLines, ja)}${viaLines.length ? ' 直通' : ''}`
      : viaLines.length
        ? `Via ${formatLineNames(viaLines, ja)}`
        : ''
    : groupedViaLines
        .map((group) => {
          const names = formatLineNames(group, ja);
          const typeName = ja
            ? (group[0]?.trainType?.name ?? '')
            : (group[0]?.trainType?.nameRoman ?? '');
          return typeName ? `${names} ${typeName}` : names;
        })
        .join('\n');

  // カードの配色・路線記号・ナンバリングは全種別で選択中の路線に揃える。行ごとに
  // 乗車路線を推定して切り替えると、同じ駅から同じように乗るのに種別ごとに色と記号が
  // 変わり、一覧として並べたときに種別の違いが読み取りづらくなるため。
  // 駅番号も同じ路線を基準に引くので CommonCard の路線記号一致が必ず成立する。
  const cardLine = selectedLine;
  const cardLineStation = getBoardingLineStation(
    boardingStation,
    cardLine,
    selectedLine
  );

  // 表示言語に関わらず引けるよう、種別名は日英どちらも検索対象に含める
  const searchText = normalizeSearchText(
    [
      trainType.name ?? '',
      trainType.nameRoman ?? '',
      subtitle,
      ...viaLines.flatMap((l) => [l.nameShort ?? '', l.nameRoman ?? '']),
    ].join(' ')
  );

  return {
    trainType,
    cardLine,
    cardLineStation,
    title,
    subtitle,
    viaLines,
    searchText,
  };
};
