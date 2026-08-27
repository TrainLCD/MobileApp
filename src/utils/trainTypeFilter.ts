import { normalizeSearchText, type TrainTypeRow } from './trainTypeList';

/**
 * 種別一覧の絞り込み条件。
 *
 * 軸をまたぐ選択は AND（「急行」かつ「東武東上線直通」）。フリーワードも常に AND。
 * 軸の中の複数選択は軸によって意味が違う。
 *
 * - 種別: OR。1 本の列車に紐づく種別は一つなので、AND では必ず 0 件になる
 * - 路線: AND。経由路線は端から端まで数珠つなぎになるため、OR にすると
 *   「みなとみらい線」と「西武池袋線」を選んだだけで、みなとみらい線側が一致した
 *   東武東上線直通まで出てしまう。両方を走り抜ける列車を求めているとみなす
 */
export type TrainTypeFilterState = {
  query: string;
  /** 種別名。表示名をそのままキーにするので、同名の別ルートはまとめて選択される */
  typeNames: string[];
  /** 経由・直通路線の路線 ID。選んだすべてを通る列車に絞る */
  lineIds: number[];
};

export const EMPTY_TRAIN_TYPE_FILTER: TrainTypeFilterState = {
  query: '',
  typeNames: [],
  lineIds: [],
};

export type TrainTypeFilterOption<T extends string | number> = {
  value: T;
  label: string;
};

export type TrainTypeFilterOptions = {
  typeNames: TrainTypeFilterOption<string>[];
  lines: TrainTypeFilterOption<number>[];
};

/**
 * 絞り込みの選択肢を一覧そのものから作る。
 *
 * 並びは一覧の初出順。事業者が返す種別順（各駅停車→急行→特急…）がそのまま
 * チップの並びになるので、利用者が普段目にする順序と一致する。
 */
export const buildTrainTypeFilterOptions = (
  rows: TrainTypeRow[],
  ja: boolean
): TrainTypeFilterOptions => {
  const typeNames: TrainTypeFilterOption<string>[] = [];
  const seenTypeName = new Set<string>();
  const lines: TrainTypeFilterOption<number>[] = [];
  const seenLineId = new Set<number>();

  for (const row of rows) {
    if (row.title && !seenTypeName.has(row.title)) {
      seenTypeName.add(row.title);
      typeNames.push({ value: row.title, label: row.title });
    }

    for (const line of row.viaLines) {
      const id = line.id;
      if (id == null || seenLineId.has(id)) {
        continue;
      }
      const label = (ja ? line.nameShort : line.nameRoman) ?? '';
      if (!label) {
        continue;
      }
      seenLineId.add(id);
      lines.push({ value: id, label });
    }
  }

  return { typeNames, lines };
};

export const isTrainTypeFilterActive = (
  filter: TrainTypeFilterState
): boolean =>
  filter.query.trim().length > 0 ||
  filter.typeNames.length > 0 ||
  filter.lineIds.length > 0;

/** チップのトグル。選択済みなら外し、未選択なら末尾に足す */
export const toggleTrainTypeFilterValue = <T extends string | number>(
  values: T[],
  value: T
): T[] =>
  values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];

export const filterTrainTypeRows = (
  rows: TrainTypeRow[],
  filter: TrainTypeFilterState
): TrainTypeRow[] => {
  const query = normalizeSearchText(filter.query.trim());

  return rows.filter((row) => {
    if (filter.typeNames.length && !filter.typeNames.includes(row.title)) {
      return false;
    }
    if (
      filter.lineIds.length &&
      !filter.lineIds.every((id) => row.viaLines.some((l) => l.id === id))
    ) {
      return false;
    }
    if (query && !row.searchText.includes(query)) {
      return false;
    }
    return true;
  });
};
