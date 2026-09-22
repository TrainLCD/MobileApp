import type { Line, Station, TrainType } from '~/@types/graphql';
import type { Journey, JourneyLeg } from '~/store/atoms/journey';
import { translate } from '~/translation';
import { getLocalizedLineName, isBusLine } from './line';
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
};

/** connectedRoutes の 1 経路(API の順位順に並ぶ) */
export type ConnectedRoute = {
  estimatedMinutes?: number | null;
  transferCount?: number | null;
  legs: ConnectedRouteLeg[] | null | undefined;
};

/**
 * 区間で既定に選ぶ列車種別。直通の経路検索と同じく各停を優先し、無ければ先頭を使う
 * @param trainTypes 区間で乗れる列車種別
 * @returns 既定の列車種別。種別が無ければ null
 */
export const pickDefaultTrainType = (
  trainTypes: TrainType[] | null | undefined
): TrainType | null =>
  findLocalType(trainTypes ?? []) ?? trainTypes?.[0] ?? null;

/**
 * 乗換を含む経路から、乗車に使う区間の並びを組み立てる。
 * 乗換のない経路は従来の 1 系統の乗車で扱うため null を返す。
 * 乗降駅か種別を引けない区間があれば、その経路は乗り継げないので null を返す
 * @param route connectedRoutes の 1 経路
 * @returns 区間の並び(現在の区間は先頭)。組み立てられなければ null
 */
export const buildJourney = (
  route: ConnectedRoute | null | undefined
): Journey | null => {
  const legs = route?.legs ?? [];
  if (legs.length < 2) return null;

  const journeyLegs: JourneyLeg[] = [];
  for (const leg of legs) {
    const trainType = pickDefaultTrainType(leg.trainTypes);
    if (!trainType?.groupId || !leg.fromStation || !leg.toStation) {
      return null;
    }
    journeyLegs.push({
      trainType,
      trainTypes: leg.trainTypes ?? [],
      fromStation: leg.fromStation,
      toStation: leg.toStation,
    });
  }

  return { legs: journeyLegs, currentLegIndex: 0 };
};

/**
 * 乗車に使える経路だけを残す。乗換のない経路は種別が 1 つでもあれば使える。
 * 乗換のある経路は、全区間の乗降駅と種別が揃っていないと乗り継げないので除く
 * @param routes connectedRoutes の結果(API の順位順)
 * @returns 乗車に使える経路(順位はそのまま)
 */
export const filterRideableRoutes = (
  routes: ConnectedRoute[]
): ConnectedRoute[] =>
  routes.filter((route) => {
    const legs = route.legs ?? [];
    if (legs.length === 1) return !!legs[0].trainTypes?.length;
    return buildJourney(route) !== null;
  });

/** 経路一覧の 1 行 */
export type RouteListItem = {
  /** 乗換駅(乗換なしならその旨) */
  title: string;
  /** 乗る路線の並びと所要時間の見込み */
  subtitle: string;
  /** カードの色・記号に使う最初の区間の路線 */
  line: Line | null;
  /** カードの駅ナンバリングに使う乗車駅 */
  boardingStation: Station | null;
};

/**
 * 経路一覧に出す 1 行を組み立てる
 * @param route connectedRoutes の 1 経路
 * @param isJapanese 日本語ロケールかどうか
 * @returns 経路一覧の 1 行
 */
export const buildRouteListItem = (
  route: ConnectedRoute,
  isJapanese: boolean
): RouteListItem => {
  const legs = route.legs ?? [];
  const stationName = (station: Station | null | undefined) =>
    (isJapanese ? station?.name : (station?.nameRoman ?? station?.name)) ?? '';

  const transferStations = legs
    .slice(0, -1)
    .map((leg) => stationName(leg.toStation));
  const title = transferStations.length
    ? translate('routeTransferAt', {
        stations: transferStations.join(isJapanese ? '・' : ' & '),
      })
    : translate('routeNoTransfer');

  const lineNames = legs
    .map((leg) => getLocalizedLineName(leg.fromStation?.line, isJapanese))
    .join(' → ');
  const subtitle =
    route.estimatedMinutes != null
      ? `${lineNames} ${translate('routeEstimatedMinutes', {
          minutes: Math.round(route.estimatedMinutes),
        })}`
      : lineNames;

  return {
    title,
    subtitle,
    line: legs[0]?.fromStation?.line ?? null,
    boardingStation: legs[0]?.fromStation ?? null,
  };
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
