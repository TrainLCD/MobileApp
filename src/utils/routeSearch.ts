import uniqBy from 'lodash/uniqBy';
import type { Line, Station, TrainType } from '~/@types/graphql';
import {
  DISNEY_RESORT_LINE_ID,
  MEIJO_LINE_ID,
  OSAKA_LOOP_LINE_ID,
  YAMANOTE_LINE_ID,
} from '~/constants/line';
import { translate } from '~/translation';
import { isBusLine } from './line';
import { findLocalType } from './trainTypeString';

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

/** connectedRoutes の 1 区間 */
export type ConnectedRouteLeg = {
  trainTypes: TrainType[] | null | undefined;
  fromStation?: Station | null;
  toStation?: Station | null;
  /** 乗車駅から降車駅までの駅グループ ID(進行順、通過駅を含む)。探索が選んだ弧 */
  stationGroupIds?: number[] | null;
};

/** connectedRoutes の 1 経路(API の順位順に並ぶ) */
export type ConnectedRoute = {
  legs: ConnectedRouteLeg[] | null | undefined;
};

/**
 * 区間で既定に選ぶ列車種別。直通の経路検索と同じく各停を優先し、無ければ先頭を使う
 * @param trainTypes 区間で乗れる列車種別
 * @returns 既定の列車種別。種別が無ければ null
 */
export const pickDefaultTrainType = (
  trainTypes: TrainType[] | null | undefined
): TrainType | null => {
  // groupId の無い種別は駅リストを引けず、選んでも乗車を始められないので候補にしない
  const selectable = (trainTypes ?? []).filter((tt) => tt.groupId != null);
  return findLocalType(selectable) ?? selectable[0] ?? null;
};

/**
 * 乗車に使える経路だけを残す。乗換のない経路は種別が 1 つでもあれば使える。
 * 乗換のある経路は、全区間の乗降駅と種別が揃っていないと駅をつなげないので除く
 * @param routes connectedRoutes の結果(API の順位順)
 * @returns 乗車に使える経路(順位はそのまま)
 */
export const filterRideableRoutes = (
  routes: ConnectedRoute[]
): ConnectedRoute[] =>
  routes.filter((route) => {
    const legs = route.legs ?? [];
    if (legs.length === 1) return !!pickDefaultTrainType(legs[0].trainTypes);
    return (
      legs.length > 1 &&
      legs.every(
        (leg) =>
          !!pickDefaultTrainType(leg.trainTypes)?.groupId &&
          !!leg.fromStation &&
          !!leg.toStation
      )
    );
  });

// 駅リストの端が継ぎ目になっている環状線。継ぎ目をまたぐ区間は端から反対の端へ回り込む
const LOOP_LINE_IDS = new Set([
  YAMANOTE_LINE_ID,
  OSAKA_LOOP_LINE_ID,
  MEIJO_LINE_ID,
  DISNEY_RESORT_LINE_ID,
]);

/**
 * 駅リストでの駅の位置。駅 id で見つからなければ同じ駅グループの駅を使う。
 * 同じ駅グループが 2 回出る系統(大江戸線の都庁前など)では、もう一方の端(reference)に
 * 近いほうを選ぶ。遠いほうを選ぶと、環状部を回り込む長い区間を切り出してしまう
 */
const indexOfStation = (
  stations: Station[],
  target: Station,
  reference = -1
): number => {
  // id・groupId が null の駅どうしを同じ駅とみなさない
  const byId =
    target.id == null ? -1 : stations.findIndex((s) => s.id === target.id);
  if (byId !== -1) return byId;
  if (target.groupId == null) return -1;

  const candidates = stations.flatMap((s, index) =>
    s.groupId === target.groupId ? [index] : []
  );
  if (reference === -1) return candidates[0] ?? -1;
  return candidates.reduce(
    (best, index) =>
      Math.abs(index - reference) < Math.abs(best - reference) ? index : best,
    candidates[0] ?? -1
  );
};

/**
 * 系統の駅リストから、区間の乗車駅から降車駅までを進行順に切り出す。
 * 環状線では継ぎ目をまたいだほうが短ければ回り込む
 * @param stations 区間の種別の lineGroupStations
 * @param from 区間の乗車駅
 * @param to 区間の降車駅
 * @returns 乗車駅から降車駅までの駅(進行順)。どちらかが見つからなければ空配列
 */
export const sliceLegStations = (
  stations: Station[],
  from: Station,
  to: Station
): Station[] => {
  // 駅 id で見つかる端を先に決め、もう一方はそれに近い位置を選ぶ
  const fromById =
    from.id == null ? -1 : stations.findIndex((s) => s.id === from.id);
  const toIndex = indexOfStation(stations, to, fromById);
  const fromIndex = indexOfStation(stations, from, toIndex);
  if (fromIndex === -1 || toIndex === -1) return [];

  const straight =
    fromIndex <= toIndex
      ? stations.slice(fromIndex, toIndex + 1)
      : stations.slice(toIndex, fromIndex + 1).reverse();

  const isLoop = LOOP_LINE_IDS.has(from.line?.id ?? -1);
  const wrapLength = stations.length - Math.abs(toIndex - fromIndex);
  if (!isLoop || wrapLength >= Math.abs(toIndex - fromIndex)) {
    return straight;
  }

  return fromIndex < toIndex
    ? [
        ...stations.slice(0, fromIndex + 1).reverse(),
        ...stations.slice(toIndex).reverse(),
      ]
    : [...stations.slice(fromIndex), ...stations.slice(0, toIndex + 1)];
};

/**
 * 区間の駅グループ ID の並び(探索が選んだ弧)に沿って、系統の駅リストから駅を拾う。
 * 同じ駅グループが系統に 2 回出る場合(大江戸線の都庁前など)は、直前に拾った駅に
 * 近いほうを選ぶ。先頭は次の駅グループに近いほうを選ぶ
 * @param stations 区間の種別の lineGroupStations
 * @param stationGroupIds 区間の駅グループ ID の並び
 * @returns 進行順の駅。並びの駅グループが系統に無ければ空配列
 */
export const pickLegStationsByGroupIds = (
  stations: Station[],
  stationGroupIds: number[]
): Station[] => {
  const indicesOf = (groupId: number | undefined) =>
    stations.flatMap((s, index) => (s.groupId === groupId ? [index] : []));
  const nearest = (candidates: number[], reference: number) =>
    candidates.reduce(
      (best, index) =>
        Math.abs(index - reference) < Math.abs(best - reference) ? index : best,
      candidates[0] ?? -1
    );

  const picked: Station[] = [];
  let previous = -1;
  for (const [position, groupId] of stationGroupIds.entries()) {
    const candidates = indicesOf(groupId);
    if (!candidates.length) return [];
    const reference =
      previous !== -1
        ? previous
        : nearest(indicesOf(stationGroupIds[position + 1]), candidates[0]);
    const index = nearest(candidates, reference);
    picked.push(stations[index]);
    previous = index;
  }
  return picked;
};

/**
 * 系統の駅リストから区間の駅を進行順に拾う。探索が選んだ弧(駅グループの並び)に沿って拾い、
 * 選んだ種別がその駅グループを持たない(探索で使った系統と別の路線を走る)ときや、弧が
 * 無いときは乗降駅から切り出す
 * @param stations 区間の種別の駅リスト
 * @param stationGroupIds 区間の駅グループ ID の並び
 * @param from 区間の乗車駅
 * @param to 区間の降車駅
 * @returns 進行順の駅。拾えなければ空配列
 */
export const pickLegStations = (
  stations: Station[],
  stationGroupIds: number[] | null | undefined,
  from: Station,
  to: Station
): Station[] => {
  const alongPath = stationGroupIds?.length
    ? pickLegStationsByGroupIds(stations, stationGroupIds)
    : [];
  return alongPath.length ? alongPath : sliceLegStations(stations, from, to);
};

/**
 * 区間ごとの駅をつないで 1 本の駅リストにする。乗換駅は前の区間の降車駅と次の区間の
 * 乗車駅の両方を残す(同じ駅 id なら 1 回だけ)。直通運転の系統でも路線が変わる駅は両方の路線の駅として 2 回並び、
 * Main 画面の各処理(dropEitherJunctionStation・種別変更の案内・直通先の表示など)は
 * その並びを前提にしているため
 * @param legStations 区間ごとの駅(進行順)
 * @returns 経路全体の駅(進行順)
 */
export const concatLegStations = (legStations: Station[][]): Station[] => {
  const result: Station[] = [];
  for (const stations of legStations) {
    // 同じ路線の上で種別だけを乗り換えるときは乗換駅の前後が同じ駅なので 1 回だけ持つ
    const skipFirst =
      stations[0]?.id != null && result.at(-1)?.id === stations[0].id;
    result.push(...(skipFirst ? stations.slice(1) : stations));
  }
  return result;
};

/**
 * 乗換のある経路を、直通運転の種別と同じ形の 1 種別として表す。
 * 種別名・色は最初の区間で乗る種別のものを使い、lines には区間ごとの路線を
 * その区間の種別つきで並べる(種別一覧で「路線名 種別名」と表示される)
 * @param route 乗換のある経路
 * @param id 種別一覧で経路を見分けるための id(実在の種別と重ならない負の値)
 * @returns 経路を表す種別。区間の種別が無ければ null
 */
export const buildTransferTrainType = (
  route: ConnectedRoute,
  id: number
): TrainType | null => {
  const legs = route.legs ?? [];
  const legTrainTypes = legs.map((leg) => pickDefaultTrainType(leg.trainTypes));
  const [firstTrainType] = legTrainTypes;
  if (!firstTrainType) return null;

  const lines = legs.flatMap((leg, index) => {
    const trainType = legTrainTypes[index];
    return [leg.fromStation?.line, leg.toStation?.line]
      .filter((line): line is NonNullable<Station['line']> => !!line)
      .map((line) => ({
        ...line,
        trainType: (trainType?.lines?.find((l) => l.id === line.id)
          ?.trainType ?? {
          typeId: trainType?.typeId,
          name: trainType?.name,
          nameRoman: trainType?.nameRoman,
        }) as Line['trainType'],
      }));
  });

  return {
    ...firstTrainType,
    id,
    line: (legs.at(-1)?.toStation?.line ??
      firstTrainType.line) as TrainType['line'],
    lines: uniqBy(lines, 'id') as unknown as TrainType['lines'],
  };
};

// 乗換のある経路を表す種別の id。実在の種別と重ならないよう、経路の順位から負の値を振る
const transferRouteTrainTypeId = (routeIndex: number): number =>
  -(routeIndex + 1);

/**
 * 種別が乗換のある経路を表すものか。buildTransferTrainType は実在の種別と重ならない
 * 負の id を振るので、それで見分ける
 * @param trainType 種別
 * @returns 乗換のある経路を表す種別なら true
 */
export const isTransferRouteTrainType = (
  trainType: TrainType | null | undefined
): boolean => (trainType?.id ?? 0) < 0;

/**
 * 行き先を選んだときに既定で選ぶ種別。API の順位が最も高い経路が乗換のある経路なら
 * その経路を表す種別、乗換のない経路なら直通の種別から各停(無ければ先頭)を選ぶ。
 * 直通に各停が無いとき、後ろの乗換経路の「各駅停車」を拾わないよう乗換経路は除いて探す
 * @param routes 乗車に使える経路(API の順位順)
 * @param trainTypes buildRouteTrainTypes の種別
 * @param transferRouteById buildRouteTrainTypes の、経路を表す種別の id から経路を引く表
 * @returns 既定の種別。種別が無ければ null
 */
export const pickInitialRouteTrainType = (
  routes: ConnectedRoute[],
  trainTypes: TrainType[],
  transferRouteById: Map<number, ConnectedRoute>
): TrainType | null =>
  trainTypes.find(
    (tt) => tt.id != null && transferRouteById.get(tt.id) === routes[0]
  ) ??
  pickDefaultTrainType(
    trainTypes.filter((tt) => !isTransferRouteTrainType(tt))
  );

/**
 * 経路検索の結果を種別一覧に並べる種別へまとめる。乗換のない経路は区間で乗れる
 * 種別をそのまま、乗換のある経路は経路ごとに 1 種別として、API の順位順に並べる
 * @param routes 乗車に使える経路(API の順位順)
 * @returns 種別一覧に並べる種別と、経路を表す種別の id から経路を引く表
 */
export const buildRouteTrainTypes = (
  routes: ConnectedRoute[]
): {
  trainTypes: TrainType[];
  transferRouteById: Map<number, ConnectedRoute>;
} => {
  const trainTypes: TrainType[] = [];
  const transferRouteById = new Map<number, ConnectedRoute>();
  const seenGroupIds = new Set<number>();

  routes.forEach((route, index) => {
    const legs = route.legs ?? [];
    if (legs.length === 1) {
      for (const trainType of legs[0].trainTypes ?? []) {
        // groupId の無い種別は選んでも駅リストを引けないので並べない
        if (trainType.groupId == null) continue;
        if (seenGroupIds.has(trainType.groupId)) continue;
        seenGroupIds.add(trainType.groupId);
        trainTypes.push(trainType);
      }
      return;
    }

    const id = transferRouteTrainTypeId(index);
    const trainType = buildTransferTrainType(route, id);
    if (!trainType) return;
    trainTypes.push(trainType);
    transferRouteById.set(id, route);
  });

  return { trainTypes, transferRouteById };
};

/** connectedRoutes の並び順(API の ConnectedRouteSort) */
export type ConnectedRouteSort =
  | 'Recommended'
  | 'ArrivalTime'
  | 'TransferCount';

// 経路を見分けるキー。乗降駅の id は路線ごとに違うので、同じ駅グループを通る並行路線
// (山手線と京浜東北線など)の経路も別のキーになる
const connectedRouteKey = (route: ConnectedRoute): string =>
  (route.legs ?? [])
    .map((leg) =>
      [
        leg.fromStation?.id,
        leg.toStation?.id,
        (leg.stationGroupIds ?? []).join(','),
        (leg.trainTypes ?? []).map((tt) => tt.groupId).join(','),
      ].join(':')
    )
    .join('|');

/**
 * 並べ替えた経路の順に、buildRouteTrainTypes の種別の並びを求める。
 * 種別そのものは組み立て直さない。乗換のある経路の種別の id は経路の順位から振るので、
 * 並べ替えた結果で組み立て直すと、選択中の種別の id が別の経路を指してしまう
 * @param trainTypes buildRouteTrainTypes(routes) の種別
 * @param routes trainTypes を組み立てた経路(乗車に使える経路、おすすめ順)
 * @param sortedRoutes 同じ条件で並び順だけを変えて取り直した経路
 * @returns trainTypes の添字を並べ替えた順に並べたもの。sortedRoutes に見つからない
 * 種別は、元の順のまま末尾に置く
 */
export const sortRouteTrainTypeIndices = (
  trainTypes: TrainType[],
  routes: ConnectedRoute[],
  sortedRoutes: ConnectedRoute[]
): number[] => {
  const indicesByKey = new Map<string, number[]>();
  routes.forEach((route, index) => {
    const key = connectedRouteKey(route);
    indicesByKey.set(key, [...(indicesByKey.get(key) ?? []), index]);
  });

  // buildRouteTrainTypes と同じく、乗換のない経路は種別の系統で、乗換のある経路は
  // 経路ごとに 1 つ数える。同じ系統が複数の経路に出るときは先に来た経路の順位を使う
  const rankByKey = new Map<string, number>();
  for (const sortedRoute of sortedRoutes) {
    const index = indicesByKey.get(connectedRouteKey(sortedRoute))?.shift();
    if (index == null) continue;
    const legs = routes[index].legs ?? [];
    if (legs.length === 1) {
      for (const trainType of legs[0].trainTypes ?? []) {
        const key = `group:${trainType.groupId}`;
        if (trainType.groupId == null || rankByKey.has(key)) continue;
        rankByKey.set(key, rankByKey.size);
      }
      continue;
    }
    rankByKey.set(`route:${transferRouteTrainTypeId(index)}`, rankByKey.size);
  }

  const rankOf = (trainType: TrainType) =>
    rankByKey.get(
      isTransferRouteTrainType(trainType)
        ? `route:${trainType.id}`
        : `group:${trainType.groupId}`
    ) ?? Number.POSITIVE_INFINITY;

  return trainTypes
    .map((trainType, index) => ({ index, rank: rankOf(trainType) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ index }) => index);
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
  const rawName = isJapanese
    ? (station.name ?? '')
    : (station.nameRoman ?? station.name ?? '');
  const stationName = rawName
    // NowHeader と同様、駅名の括弧書き(路線名などの補足)は見出しでは省く。
    // 駅 API は全角括弧も返すため半角・全角の双方を対象にする(#1175 と同じ事情)
    .replaceAll(/[（(][^（）()]*[）)]/g, '')
    // 括弧書きの除去で生じた連続空白だけを畳む
    // (「Tokyo Sta. Marunouchi South Exit」のように語間の単一空白を持つ駅名があるため)
    .replace(/\s{2,}/g, ' ')
    .trim();
  // 括弧書きを除いた結果が空になる駅名もフォールバックさせる
  if (!stationName.length) return translate('searchResult');
  // バス停は「駅」ではないため接尾辞を出し分ける(NowHeader のバスバッジと同じ判定)
  return isBusLine(station.line)
    ? translate('searchResultFromBusStop', { stationName })
    : translate('searchResultFromStation', { stationName });
};
