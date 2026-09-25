import type { Station, TrainType } from '~/@types/graphql';
import type { SavedRouteLeg } from '~/models/SavedRoute';
import { buildRouteLegInputs } from './currentLineGroupStations';
import {
  buildTransferTrainType,
  concatLegStations,
  pickLegStations,
} from './routeSearch';

/**
 * 乗換経路をつないだ駅リストから、プリセットに保存する区間を組み立てる。
 * 区間の系統と乗降駅は estimateArrivalTimes / trainRoute に渡す legs と同じ求め方をし、
 * 駅グループの並びは乗車駅から降車駅までの駅から取る(開いたときに同じ弧で拾い直すため)
 * @param stations 経路検索で組み立てた駅リスト(乗車駅から行き先への進行順)
 * @returns 区間の並び。1 系統だけの駅リストや、区間を組み立てられない場合は null
 */
export const buildSavedRouteLegs = (
  stations: Station[]
): SavedRouteLeg[] | null => {
  const inputs = buildRouteLegInputs(stations);
  if (!inputs) return null;

  const legs: SavedRouteLeg[] = [];
  // 同じ駅が経路に 2 回出る系統(大江戸線の都庁前など)で前の区間の駅を拾わないよう、
  // 直前の区間の降車駅から先を探す
  let cursor = 0;
  for (const input of inputs) {
    const fromIndex = stations.findIndex(
      (s, index) => index >= cursor && s.id === input.fromStationId
    );
    const toIndex = stations.findIndex(
      (s, index) => index > fromIndex && s.id === input.toStationId
    );
    if (fromIndex === -1 || toIndex === -1) return null;

    const stationGroupIds = stations
      .slice(fromIndex, toIndex + 1)
      .map((s) => s.groupId);
    if (stationGroupIds.some((groupId) => groupId == null)) return null;

    legs.push({
      ...input,
      stationGroupIds: stationGroupIds as number[],
    });
    cursor = toIndex;
  }
  return legs;
};

/**
 * 保存した区間を、系統ごとの駅リストから拾い直す
 * @param legs プリセットの区間
 * @param stationsByLineGroupId 区間の系統の駅リストを引く関数
 * @returns 区間ごとの駅(進行順)。拾えない区間があれば null
 */
export const pickSavedRouteLegStations = (
  legs: SavedRouteLeg[],
  stationsByLineGroupId: (lineGroupId: number) => Station[] | undefined
): Station[][] | null => {
  const legStations = legs.map((leg) => {
    const stations = stationsByLineGroupId(leg.lineGroupId) ?? [];
    // 乗降駅が系統の駅リストに無ければ、同じ駅グループの駅で切り出させる
    const endpoint = (id: number, groupId: number | undefined) =>
      stations.find((s) => s.id === id) ?? ({ id, groupId } as Station);
    return pickLegStations(
      stations,
      leg.stationGroupIds,
      endpoint(leg.fromStationId, leg.stationGroupIds[0]),
      endpoint(leg.toStationId, leg.stationGroupIds.at(-1))
    );
  });
  return legStations.some((stations) => !stations.length) ? null : legStations;
};

/**
 * 保存した区間をつないで、経路検索で選んだときと同じ 1 本の駅リストにする
 * @param legs プリセットの区間
 * @param stationsByLineGroupId 区間の系統の駅リストを引く関数
 * @returns 経路全体の駅(進行順)。拾えない区間があれば空配列
 */
export const buildSavedRouteStations = (
  legs: SavedRouteLeg[],
  stationsByLineGroupId: (lineGroupId: number) => Station[] | undefined
): Station[] => {
  const legStations = pickSavedRouteLegStations(legs, stationsByLineGroupId);
  return legStations ? concatLegStations(legStations) : [];
};

// プリセットから開いた乗換経路の種別の id。経路検索と同じく負の値にして乗換経路と見分ける
const SAVED_TRANSFER_ROUTE_TRAIN_TYPE_ID = -1;

/**
 * 保存した区間から、経路検索で乗換経路を選んだときと同じ形の種別を組み立てる。
 * 区間で乗る種別は、区間の駅のうちその系統に停まる駅の種別を使う
 * @param legs プリセットの区間
 * @param legStations pickSavedRouteLegStations で拾った区間ごとの駅
 * @returns 経路を表す種別。区間の種別を引けなければ null
 */
export const buildSavedTransferTrainType = (
  legs: SavedRouteLeg[],
  legStations: Station[][]
): TrainType | null => {
  const routeLegs = legs.map((leg, index) => {
    const stations = legStations[index] ?? [];
    const trainType = stations.find(
      (s) => s.trainType?.groupId === leg.lineGroupId
    )?.trainType;
    return {
      trainTypes: trainType ? [trainType as unknown as TrainType] : [],
      fromStation: stations[0] ?? null,
      toStation: stations.at(-1) ?? null,
      stationGroupIds: leg.stationGroupIds,
    };
  });
  if (routeLegs.some((leg) => !leg.trainTypes.length)) return null;
  return buildTransferTrainType(
    { legs: routeLegs },
    SAVED_TRANSFER_ROUTE_TRAIN_TYPE_ID
  );
};

/**
 * 2 つの区間の並びが同じ経路を表すか。系統と乗降駅が同じでも、環状線の内回りと外回りのように
 * 通る駅が違えば別の経路とみなす
 */
export const isSameSavedRouteLegs = (
  a: SavedRouteLeg[],
  b: SavedRouteLeg[]
): boolean =>
  a.length === b.length &&
  a.every(
    (leg, index) =>
      leg.lineGroupId === b[index].lineGroupId &&
      leg.fromStationId === b[index].fromStationId &&
      leg.toStationId === b[index].toStationId &&
      leg.stationGroupIds.join(',') === b[index].stationGroupIds.join(',')
  );
