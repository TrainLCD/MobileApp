import type { Line, Station, TrainType } from '~/@types/graphql';

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

export type ConnectedRoute = {
  id: number | null;
  stops: Station[] | null;
};

/**
 * ConnectedRoutes の各経路を既存の列車種別選択UIで扱える形へ変換する。
 * 経路IDは StationAPI が経路全体へ付与した仮想 lineGroupId であり、
 * 各区間の路線・種別は stops から復元する。
 */
export const buildConnectedRouteTrainType = (
  route: ConnectedRoute
): TrainType | null => {
  if (!route.id) return null;

  const stops = route.stops ?? [];
  const baseTrainType = stops.find((stop) => stop.trainType)?.trainType;
  if (!baseTrainType) return null;

  const seenLineIds = new Set<number>();
  const lines = stops.flatMap((stop) => {
    const line = stop.line;
    if (!line?.id || seenLineIds.has(line.id)) return [];

    seenLineIds.add(line.id);
    return [
      {
        ...line,
        trainType: stop.trainType ?? line.trainType,
      } as Line,
    ];
  });

  return {
    ...baseTrainType,
    id: route.id,
    groupId: route.id,
    line: lines[0] ?? baseTrainType.line,
    lines,
  } as unknown as TrainType;
};
