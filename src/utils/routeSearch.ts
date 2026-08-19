import type { Line, Station, TrainType } from '~/@types/graphql';
import { translate } from '~/translation';
import { isBusLine } from './line';

/**
 * 列車種別に基づいて、現在の駅の路線を決定する
 * @param station 現在の駅
 * @param pendingLine 選択された行き先の路線
 * @param trainTypes 列車種別の配列
 * @returns 路線情報が更新された駅、または null
 */
export const computeCurrentStationInRoutes = (
  station: Station | null,
  pendingLine: Line | null,
  trainTypes: TrainType[]
): Station | null => {
  if (!station || !pendingLine) return null;

  const currentIds = new Set(
    (station.lines ?? []).map((l) => l?.id).filter(Boolean)
  );

  // 列車種別に関連する路線IDを収集
  const routeLineIdSet = new Set(
    trainTypes
      .flatMap((tt: TrainType) => [
        tt.line?.id,
        ...(tt.lines ?? []).map((l) => l.id),
      ])
      .filter(Boolean)
  );

  // 列車種別の路線とstationの路線の共通路線を探す
  const commonIds = [...currentIds].filter((id) => routeLineIdSet.has(id));
  const commonLine = (station.lines ?? []).find((l) =>
    commonIds.includes(l.id)
  );

  if (commonLine) {
    return { ...station, line: commonLine } as Station;
  }

  // 共通路線がない場合、stationにpendingLineと同じ路線があればそれを使用
  const fallbackLine = station.lines?.find((l) => l.id === pendingLine.id);

  if (fallbackLine) {
    return { ...station, line: fallbackLine } as Station;
  }

  return { ...station, line: pendingLine } as Station;
};

/**
 * 列車種別が存在しない場合に、選択した路線に一致する駅の路線を取得する
 * @param station 現在の駅
 * @param selectedLine 選択した行き先駅の路線
 * @returns 一致する路線を持つ駅
 */
export const getStationWithMatchingLine = (
  station: Station | null,
  selectedLine: Line | null
): Station | null => {
  if (!station || !selectedLine) return null;

  const matchingLine = station.lines?.find((l) => l.id === selectedLine.id);

  if (matchingLine) {
    return { ...station, line: matchingLine } as Station;
  }

  return station;
};

/**
 * 経路検索結果の見出し文言を組み立てる
 * @param station 検索の起点となる最寄り駅(位置情報未取得などで未確定の場合は null)
 * @param isJapanese 日本語ロケールかどうか
 * @returns 駅が確定していれば駅名入りの見出し、未確定なら駅名なしの見出し
 */
export const getSearchResultHeadingText = (
  station: Station | null,
  isJapanese: boolean
): string => {
  if (!station) return translate('searchResult');
  // NowHeader と同様、駅名の括弧書き(路線名などの補足)は見出しでは省く
  const parenthesesRe = /\([^()]*\)/g;
  const stationName = isJapanese
    ? (station.name ?? '').replaceAll(parenthesesRe, '')
    : (station.nameRoman ?? station.name ?? '').replaceAll(parenthesesRe, '');
  if (!stationName.length) return translate('searchResult');
  // バス停は「駅」ではないため接尾辞を出し分ける(NowHeader のバスバッジと同じ判定)
  return isBusLine(station.line)
    ? translate('searchResultFromBusStop', { stationName })
    : translate('searchResultFromStation', { stationName });
};
