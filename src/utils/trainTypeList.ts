import type { Line, Station, StationNested } from '~/@types/graphql';

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
 * カードの配色・路線記号・ナンバリングはこの乗車路線で統一することで、乗車駅に必ず
 * 存在する駅番号を使ってナンバリングを安定して表示できる。
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
