#!/usr/bin/env node
// Xcode の位置シミュレーション用 GPX を StationAPI の実座標から生成する。
//
// オートモード(useSimulationMode)は locationAtom へ直接書き込むため、
// setLocation の速度フィルタ・EMA スムージング・基準の張り直しを一切通らない。
// 測位パイプライン(Core Location → watchPositionAsync → handleTrackingLocation
// → setLocation)を通した検証には、OS 側から測位を流し込む必要がある。
// 生成した GPX を Xcode の Debug > Simulate Location > Add GPX File to Workspace…
// に登録すると、シミュレータが実際の測位として再生する。
//
// 速度プロファイルはアプリ本体の generateTrainSpeedProfile をそのまま使う。
// 独自の加減速モデルを持たせるとアプリの想定と乖離するため。
//
// 使い方:
//   node scripts/generate-location-gpx.mjs --line 1004 --from 100418 --to 100411 \
//     --max-speed 320 --out assets/gpx/SampleTohokuShinkansen.gpx
//
// 駅 ID は StationAPI の lineStations が返す値。--list で一覧を確認できる。
//
// --line-group を使うと列車種別グループ (lineGroupId) の経路をそのまま走らせる。
// lineGroupStations は駅ごとの stopCondition を返すので、通過駅を --skip で
// 手で並べる必要が無くなり、直通で複数路線にまたがる経路もそのまま扱える。
// アプリ側の判定 (src/utils/isPass.ts) と同じ規則で停車・通過を決める。

import { realpathSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { generateTrainSpeedProfile } from '../src/utils/trainSpeed.ts';

const DEFAULT_API_URL = 'https://gql.trainlcd.app/';
// 1 秒間隔。iOS は distanceInterval 基準で概ね 1Hz 配信のため実機に近い。
const INTERVAL_SEC = 1;
// 停車駅での停車時間(秒)。到着判定が成立するだけの滞在を作る。
const DEFAULT_DWELL_SEC = 60;
const EARTH_RADIUS_M = 6_371_008.8;

// trainlcd 独自拡張の名前空間。GPX 1.1 の <extensions> は
// `<xsd:any namespace="##other" processContents="lax">` なので、GPX 以外の
// 名前空間に属していれば妥当なまま任意の要素を置ける(逆に名前空間が無いと不正)。
// URI は識別子であって取得先ではないため実在しなくてよい。
// 要素の意味は docs/location-simulation.md に定義する。
const TRAINLCD_GPX_NS = 'https://trainlcd.app/xmlns/gpx/v1';

// 電波環境のプロファイル。既定の open は従来どおり「常に測位が届き、精度は
// 再生側が決める」トラックで、精度も穴も書き出さない。
//
// subway は経路のうち地下を走る区間だけを劣化させる(判定は isUndergroundStation)。
// 直通運転(--line-group)では駅ごとに line が異なるため、地上の路線へ乗り入れた
// 区間は地上のまま残り、地下 <-> 地上の切り替わりが 1 本のトラックに入る。これは
// setLocation が基準を張り直す経路(地下鉄からの復帰)を踏ませるために要る。
//
// 数値はアプリ側の判定境界から逆算している。
//  - 地上区間は通常の GPS が効くので BAD_ACCURACY_THRESHOLD (200m) より十分良く、
//    ばらつきも小さい帯に置く。isAccuracyStable(src/store/atoms/location.ts) が
//    true になり、スムージングが働く。
//  - 地下駅のホームは Wi-Fi / 基地局が届くので、地上ほどではないが 200m 以内。
//  - 走り出して坑口を離れると基地局測位だけになるため、必ず 200m を超える帯へ移す。
//    accuracyHistory(直近12点)の平均が 200m を上回った時点で isAccuracyStable が
//    false になり、setLocation の地下鉄分岐(skipSmoothing)に入る。
//    MAX_PERMIT_ACCURACY(1500m)は超えないので、精度フィルタでの棄却は起きない。
//  - トンネル内は測位そのものが来ない。点を落とすと <time> に穴が開き、再生側も
//    Jest 側も「測位が届かない時間」として扱う。
//
// 地下/地上の別は StationAPI の lineType と --subway-lines で決まる。どちらも
// 路線単位なので、一部だけ地下化されている路線(東急東横線の渋谷付近など)は
// 区間ごとには分かれない。
const SIGNAL_PROFILES = {
  open: null,
  subway: {
    // 地上区間の精度帯(m)
    surfaceAccuracy: [8, 20],
    // 地下駅のホーム(停車中)の精度帯(m)
    platformAccuracy: [25, 60],
    // 坑口付近、基地局測位のみの精度帯(m)
    portalAccuracy: [260, 620],
    // 停車点から何秒ぶんを坑口付近として残すか。これを超えた地下の走行点は落とす
    portalSec: 20,
  },
};
const SIGNAL_PROFILE_NAMES = Object.keys(SIGNAL_PROFILES);
const DEFAULT_SIGNAL_PROFILE = 'open';

const usage = `使い方: node scripts/generate-location-gpx.mjs [options]

  --line <id>         路線 ID (例: 東北新幹線 = 1004)
  --line-group <id>   列車種別グループ ID。通過駅は stopCondition から自動判定する
                      (--line と排他。どちらか一方が必須)
  --from <stationId>  始点の駅 ID (--line では必須。--line-group では既定で経路の先頭)
  --to <stationId>    終点の駅 ID (--line では必須。--line-group では既定で経路の末尾)
  --max-speed <km/h>  最高速度 (既定: 320)
  --dwell <sec>       各停車駅での停車時間 (既定: ${DEFAULT_DWELL_SEC})
  --skip <ids>        通過駅の ID をカンマ区切りで指定 (停車せず素通りする)
                      --line-group では stopCondition による判定に追加される
  --start <ISO8601>   先頭 waypoint の時刻。タイムゾーン(Z または ±HH:MM)必須
                      (既定: 2026-01-01T00:00:00Z)
                      平日/休日運転の stopCondition はこの日付(JST)で判定する
  --signal-profile <name>
                      電波環境 (${SIGNAL_PROFILE_NAMES.join(' | ')}。既定: ${DEFAULT_SIGNAL_PROFILE})
                      subway は駅間の測位を落とし、残る点に地下向けの水平精度を
                      trainlcd 拡張として書き出す
  --subway-lines <ids>
                      地下扱いにする路線 ID (カンマ区切り)。lineType が Subway で
                      なくても地下として扱う。全線地下なのに API 上は Normal の
                      路線 (みなとみらい線 99310、西武有楽町線 22003 など) 向け
  --out <path>        出力先 (既定: 標準出力)
  --api <url>         StationAPI の URL (既定: $GQL_API_URL または ${DEFAULT_API_URL})
  --list              路線 / 種別グループの駅一覧を表示して終了する
  --list-train-types <stationId>
                      その駅を通る列車種別と lineGroupId を表示して終了する
`;

// タイムゾーン(Z または ±HH:MM)付きの ISO 8601 日時のみを受理する。
// Date.parse は 'May 1, 2026' のような非 ISO 形式も受理し、さらに
// '2026-05-01T09:00:00' のようなオフセット無しの日時を「ローカル時刻」として
// 解釈するため、同じ引数でも実行環境の TZ 次第で出力の <time> が変わる。
// 生成物を再現可能にするうえで致命的なので、形式と暦日の両方を検証する。
// 各フィールドの取りうる範囲まで正規表現で縛る。\d{2} のままだと 25 時や
// 13 月が素通りする。
const ISO8601_WITH_TIMEZONE =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/;

export const isValidIso8601WithTimezone = (value) => {
  const matched = ISO8601_WITH_TIMEZONE.exec(value);
  if (!matched) {
    return false;
  }
  // 暦日の妥当性は正規表現では表せない。Date.parse も 2026-02-30 を 3/2 へ
  // 繰り上げて受理してしまうため、UTC で往復させて桁が保たれるかを見る。
  const [, year, month, day] = matched;
  const roundTripped = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day))
  );
  return (
    roundTripped.getUTCFullYear() === Number(year) &&
    roundTripped.getUTCMonth() === Number(month) - 1 &&
    roundTripped.getUTCDate() === Number(day)
  );
};

export const parseArgs = (argv) => {
  const args = {
    maxSpeed: 320,
    dwell: DEFAULT_DWELL_SEC,
    skip: [],
    signalProfile: DEFAULT_SIGNAL_PROFILE,
    subwayLines: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) {
        throw new Error(`${key} に値が指定されていません`);
      }
      return value;
    };
    switch (key) {
      case '--line':
        args.line = Number(next());
        break;
      case '--line-group':
        args.lineGroup = Number(next());
        break;
      case '--from':
        args.from = Number(next());
        break;
      case '--to':
        args.to = Number(next());
        break;
      case '--max-speed':
        args.maxSpeed = Number(next());
        break;
      case '--dwell':
        args.dwell = Number(next());
        break;
      case '--skip':
        args.skip = next()
          .split(',')
          .map((v) => Number(v.trim()))
          .filter((v) => Number.isFinite(v));
        break;
      case '--start':
        args.start = next();
        break;
      case '--signal-profile':
        args.signalProfile = next();
        break;
      case '--subway-lines':
        args.subwayLines = next()
          .split(',')
          .map((v) => Number(v.trim()))
          .filter((v) => Number.isFinite(v));
        break;
      case '--out':
        args.out = next();
        break;
      case '--api':
        args.api = next();
        break;
      case '--list':
        args.list = true;
        break;
      case '--list-train-types':
        args.listTrainTypes = Number(next());
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        throw new Error(`不明なオプション: ${key}`);
    }
  }
  return args;
};

const queryStationApi = async (apiUrl, query, variables) => {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(
      `StationAPI への問い合わせに失敗しました: HTTP ${res.status}`
    );
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(
      `StationAPI がエラーを返しました: ${json.errors.map((e) => e.message).join(', ')}`
    );
  }
  return json.data ?? {};
};

const fetchLineStations = async (apiUrl, lineId) => {
  const data = await queryStationApi(
    apiUrl,
    `query GenerateGpxLineStations($lineId: Int!) {
      lineStations(lineId: $lineId) {
        id
        name
        nameRoman
        latitude
        longitude
        line {
          id
          nameShort
          lineType
        }
      }
    }`,
    { lineId }
  );
  const stations = data.lineStations ?? [];
  if (stations.length === 0) {
    throw new Error(`路線 ${lineId} の駅が見つかりませんでした`);
  }
  return stations;
};

// 種別グループの経路。stopCondition が停車/通過を、line が直通先の路線を表す。
const fetchLineGroupStations = async (apiUrl, lineGroupId) => {
  const data = await queryStationApi(
    apiUrl,
    `query GenerateGpxLineGroupStations($lineGroupId: Int!) {
      lineGroupStations(lineGroupId: $lineGroupId) {
        id
        name
        nameRoman
        latitude
        longitude
        stopCondition
        line {
          id
          nameShort
          lineType
        }
      }
    }`,
    { lineGroupId }
  );
  const stations = data.lineGroupStations ?? [];
  if (stations.length === 0) {
    throw new Error(`種別グループ ${lineGroupId} の駅が見つかりませんでした`);
  }
  return stations;
};

// lineGroupId は駅からしか辿れないため、--list-train-types の裏側で使う。
const fetchStationTrainTypes = async (apiUrl, stationId) => {
  const data = await queryStationApi(
    apiUrl,
    `query GenerateGpxStationTrainTypes($stationId: Int!) {
      stationTrainTypes(stationId: $stationId) {
        typeId
        groupId
        name
        nameRoman
        line {
          id
          nameShort
        }
      }
    }`,
    { stationId }
  );
  const trainTypes = data.stationTrainTypes ?? [];
  if (trainTypes.length === 0) {
    throw new Error(`駅 ${stationId} に列車種別がありません`);
  }
  return trainTypes;
};

// 大圏距離(m)。区間長は数十 km になるため平面近似だと誤差が無視できない。
export const distanceBetween = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

// 隣り合う駅の間は直線補間する。実際の線形とは異なるが、折れ点が実際の駅座標
// なので、各駅の到着判定(ARRIVED_MAX_THRESHOLD)は現実と同じ位置で成立する。
const interpolate = (from, to, ratio) => ({
  latitude: from.latitude + (to.latitude - from.latitude) * ratio,
  longitude: from.longitude + (to.longitude - from.longitude) * ratio,
});

// 折れ線(全駅)の始点からの累積距離を求める
export const cumulativeDistances = (polyline) => {
  const cumulative = [0];
  for (let i = 1; i < polyline.length; i++) {
    cumulative.push(
      cumulative[i - 1] + distanceBetween(polyline[i - 1], polyline[i])
    );
  }
  return cumulative;
};

// travelled(m) の地点を含む区間 polyline[i-1] -> polyline[i] の i を返す。
// 両端は最初 / 最後の区間へ丸めるので、戻り値は必ず 1 以上 length-1 以下。
export const segmentIndexAtDistance = (cumulative, travelled) => {
  let i = 1;
  while (i < cumulative.length - 1 && cumulative[i] < travelled) {
    i++;
  }
  return i;
};

// 折れ線の始点から travelled(m) 進んだ地点の座標を返す
export const pointAtDistance = (polyline, cumulative, travelled) => {
  const total = cumulative.at(-1);
  if (travelled <= 0) {
    return { ...polyline[0] };
  }
  if (travelled >= total) {
    return { ...polyline.at(-1) };
  }
  const i = segmentIndexAtDistance(cumulative, travelled);
  const segmentLength = cumulative[i] - cumulative[i - 1];
  const ratio =
    segmentLength > 0 ? (travelled - cumulative[i - 1]) / segmentLength : 1;
  return interpolate(polyline[i - 1], polyline[i], ratio);
};

// travelled(m) の地点が属する区間の、起点側の駅。直通では駅ごとに line が違うため、
// 「いまどの路線を走っているか」は区間の起点駅から決める(境界駅で切り替わる)。
export const stationAtDistance = (polyline, cumulative, travelled) => {
  if (travelled <= 0) {
    return polyline[0];
  }
  if (travelled >= cumulative.at(-1)) {
    return polyline.at(-1);
  }
  return polyline[segmentIndexAtDistance(cumulative, travelled) - 1];
};

// 停車/通過の判定はアプリ本体 (src/utils/isPass.ts) と同じ規則にする。
// ここが食い違うと、GPX では停車しているのに画面上は通過扱い(あるいはその逆)に
// なり、生成物が検証に使えなくなる。
// isHoliday は「その日が休日か」。アプリは実行時の日付で判定するが、GPX は
// --start の日付を再生時刻として持つので、こちらもその日付で判定する。
export const isPassStopCondition = (stopCondition, isHoliday) => {
  switch (stopCondition) {
    case 'Not':
      return true;
    // 平日運転 = 休日は通過。休日運転 = 平日は通過。
    case 'Weekday':
      return isHoliday;
    case 'Holiday':
      return !isHoliday;
    // All / Partial(一部通過) / PartialStop(一部停車) はいずれも停車扱い。
    default:
      return false;
  }
};

// 日本の暦で土日・祝日かを返す。祝日判定は @holiday-jp/holiday_jp に依存するが、
// このスクリプトは依存ゼロで動かせる必要がある(node --test のジョブは npm ci を
// 挟まない)ため、実際に平日/休日運転の駅が現れたときだけ遅延 import する。
export const resolveIsHoliday = async (date) => {
  // stopCondition は日本の運転日基準なので JST の暦日で見る。
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  // holiday_jp は渡された Date を getFullYear/getMonth/getDate、つまり実行環境の
  // ローカル時刻で解釈する。+9h しただけの Date をそのまま渡すと、TZ=Asia/Tokyo の
  // 環境では JST 15:00 以降で判定日が翌日へずれる(JST 1/1 19:00 が 1/2 と判定され、
  // 元日を取りこぼす)。JST の年月日をローカル時刻の Date として組み直して渡す。
  const jstCalendarDate = new Date(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );
  const day = jstCalendarDate.getDay();
  if (day === 0 || day === 6) {
    return true;
  }
  const holidayJp = await import('@holiday-jp/holiday_jp').catch(() => {
    throw new Error(
      '平日/休日運転の駅を含む経路の判定には @holiday-jp/holiday_jp が必要です。npm install を実行してください'
    );
  });
  return (holidayJp.default ?? holidayJp).isHoliday(jstCalendarDate);
};

// route 上で実際に停車する駅の index を返す。始点と終点は必ず停車する
// (その駅から発車し、その駅で終着するため)。
export const resolveStopIndices = ({ route, skippedIds, isHoliday }) =>
  route
    .map((station, i) => {
      if (i === 0 || i === route.length - 1) {
        return i;
      }
      if (skippedIds.has(station.id)) {
        return -1;
      }
      return isPassStopCondition(station.stopCondition, isHoliday) ? -1 : i;
    })
    .filter((i) => i !== -1);

// 同じ経路をアプリで開くためのディープリンクのクエリ部を組み立てる。
// skips は sids 配列に対する 0 起点の通過駅 index (src/hooks/useDeepLink.ts)。
// 種別グループでは通過駅を自動判定するため、手で数え直せるようにここで出す。
export const buildDeepLinkQuery = (route, stopIndices) => {
  const stops = new Set(stopIndices);
  const skips = route
    .map((_, i) => (stops.has(i) ? -1 : i))
    .filter((i) => i !== -1);
  const sids = `sids=${route.map((s) => s.id).join(',')}`;
  return skips.length > 0 ? `${sids}&skips=${skips.join(',')}` : sids;
};

// route: 経路上の全駅(通過駅を含む折れ線の節点)
// stopIndices: そのうち実際に停車する駅の index(始点と終点を必ず含む)
//
// 通過駅で停車しないよう、速度プロファイルは「停車駅から停車駅まで」を 1 本の
// 走行として生成する。通過駅を区切りにすると駅ごとに減速・停止してしまう。
// 地下を走る区間かどうか。原則は StationAPI の lineType だが、これは路線単位の
// 属性なので、全線地下でも Normal で登録されている路線がある(みなとみらい線、
// 西武有楽町線など)。--subway-lines でそうした路線を地下側へ寄せる。
// 逆に一部だけ地下化されている路線(東急東横線の渋谷〜代官山)は路線単位では
// 表せないため、駅数の多い側に倒して地上のままにする。
export const isUndergroundStation = (station, subwayLineIds) =>
  station?.line?.lineType === 'Subway' ||
  (station?.line?.id != null && subwayLineIds.has(station.line.id));

export const buildWaypoints = ({
  route,
  stopIndices,
  maxSpeedKmh,
  dwellSec,
  subwayLineIds = new Set(),
}) => {
  const maxSpeed = maxSpeedKmh / 3.6; // m/s
  // stopped は「駅に止まっている点」。電波プロファイル(applySignalProfile)が
  // 駅からの距離を時間で測るために使う。始発駅は停車時間を持たないが、
  // 発車前の 1 点なので駅にいる扱いにする。
  const waypoints = [
    {
      ...route[0],
      elapsed: 0,
      stopped: true,
      underground: isUndergroundStation(route[0], subwayLineIds),
    },
  ];
  let elapsed = 0;

  for (let leg = 0; leg < stopIndices.length - 1; leg++) {
    const polyline = route.slice(stopIndices[leg], stopIndices[leg + 1] + 1);
    const cumulative = cumulativeDistances(polyline);
    const distance = cumulative.at(-1);

    // 出力を再現可能にするため惰行のランダム性は無効にする
    const speedProfile = generateTrainSpeedProfile({
      distance,
      maxSpeed,
      interval: INTERVAL_SEC,
      enableRandomCoast: false,
    });

    // 直通運転では乗り入れの境界駅が路線ごとに 2 回並ぶ(和光市が東京メトロ
    // 副都心線と東武東上線の両方に現れるなど)。同じ地点なので区間長が 0 になり、
    // generateTrainSpeedProfile が [0] を返すため「走行扱いなのに 1mm も進まない点」
    // が 1 点だけ混じる。電波プロファイルから見るとそこへトンネル内の精度が付き、
    // 「駅に停まったまま基地局測位しか入らない」現実にない点になる。
    // 停車扱いのまま次へ進める。この分岐を通る境界駅は、旧実装より 1 点(1 秒)短くなる。
    if (distance < 1) {
      const here = polyline.at(-1);
      const dwellPoints = leg === stopIndices.length - 2 ? 0 : dwellSec;
      for (let t = -INTERVAL_SEC; t < dwellPoints; t += INTERVAL_SEC) {
        elapsed += INTERVAL_SEC;
        waypoints.push({
          ...here,
          elapsed,
          stopped: true,
          underground: isUndergroundStation(here, subwayLineIds),
        });
      }
      continue;
    }

    let travelled = 0;
    for (const speed of speedProfile) {
      travelled = Math.min(distance, travelled + speed * INTERVAL_SEC);
      elapsed += INTERVAL_SEC;
      waypoints.push({
        ...pointAtDistance(polyline, cumulative, travelled),
        elapsed,
        stopped: false,
        underground: isUndergroundStation(
          stationAtDistance(polyline, cumulative, travelled),
          subwayLineIds
        ),
      });
    }

    // プロファイルの離散化誤差で駅に届かないことがあるため、到着点を明示的に置く
    const arrival = polyline.at(-1);
    elapsed += INTERVAL_SEC;
    waypoints.push({
      ...arrival,
      elapsed,
      stopped: true,
      underground: isUndergroundStation(arrival, subwayLineIds),
    });

    // 終点以外は停車する。停車中も測位は届き続けるので同じ座標を並べる
    const isFinalStop = leg === stopIndices.length - 2;
    if (!isFinalStop) {
      for (let t = 0; t < dwellSec; t += INTERVAL_SEC) {
        elapsed += INTERVAL_SEC;
        waypoints.push({
          ...arrival,
          elapsed,
          stopped: true,
          underground: isUndergroundStation(arrival, subwayLineIds),
        });
      }
    }
  }

  return waypoints;
};

// 再現性のある一様乱数。生成物は繰り返し同じ内容になる必要があるため
// Math.random は使わない(--start の形式を厳格に縛っているのと同じ理由)。
const makeRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

/**
 * 電波環境のプロファイルを適用する。
 *
 * 地下鉄区間だけを劣化させる。地下の走行中でも駅から portalSec 以内の点は坑口付近
 * として残し、それより奥は落とす。残した点には水平精度(m)を付ける。
 * open では何もしない。
 */
export const applySignalProfile = (waypoints, profileName) => {
  const profile = SIGNAL_PROFILES[profileName];
  if (!profile) {
    return waypoints;
  }
  const stopElapsed = waypoints
    .filter((wp) => wp.stopped)
    .map((wp) => wp.elapsed);
  if (stopElapsed.length === 0) {
    throw new Error('停車している点がないため電波プロファイルを適用できません');
  }
  const random = makeRandom(0x5eed);
  const pick = ([min, max]) => Math.round(min + (max - min) * random());

  // waypoints も stopElapsed も時刻の昇順なので、最寄りの停車点は前へ戻らない。
  // 坑口の窓は「直前/直後の停車駅から何秒か」で測る。境界駅が地上路線側でも
  // (和光市で東武東上線から副都心線へ入るなど)その駅を起点に測ってよい。
  // 書き出す座標は 7 桁に丸めるので、動いたかどうかも丸めた後で判定する。
  // 加減速プロファイルの端では速度が 0 のまま数点続き、停車フラグは立っていないのに
  // 位置が 1mm も変わらないことがある。そこへトンネル内の精度を付けると
  // 「駅に停まったまま基地局測位しか入らない」現実にない点になる。
  const key = (wp) => `${wp.latitude.toFixed(7)},${wp.longitude.toFixed(7)}`;

  let nearest = 0;
  let previousKey = null;
  const result = [];
  for (const wp of waypoints) {
    const currentKey = key(wp);
    const moved = previousKey !== null && currentKey !== previousKey;
    previousKey = currentKey;
    while (
      nearest + 1 < stopElapsed.length &&
      Math.abs(stopElapsed[nearest + 1] - wp.elapsed) <=
        Math.abs(stopElapsed[nearest] - wp.elapsed)
    ) {
      nearest += 1;
    }
    if (!wp.underground) {
      result.push({ ...wp, accuracy: pick(profile.surfaceAccuracy) });
      continue;
    }
    if (wp.stopped || !moved) {
      result.push({ ...wp, accuracy: pick(profile.platformAccuracy) });
      continue;
    }
    if (Math.abs(stopElapsed[nearest] - wp.elapsed) <= profile.portalSec) {
      result.push({ ...wp, accuracy: pick(profile.portalAccuracy) });
      continue;
    }
    // トンネル内。点を落として <time> に穴を開ける
  }
  return result;
};

export const toGpx = (waypoints, startTime) => {
  const startMs = Date.parse(startTime);
  const body = waypoints
    .map((wp) => {
      const time = new Date(startMs + wp.elapsed * 1000).toISOString();
      const lines = [
        `<wpt lat="${wp.latitude.toFixed(7)}" lon="${wp.longitude.toFixed(7)}">`,
        `<time>${time}</time>`,
      ];
      if (wp.accuracy != null) {
        lines.push(
          `<extensions><trainlcd:accuracy>${wp.accuracy}</trainlcd:accuracy></extensions>`
        );
      }
      lines.push('</wpt>');
      return lines.join('\n');
    })
    .join('\n');

  // 名前空間の宣言は精度を書くときだけ付ける。GPX 1.1 の extensions は
  // GPX 以外の名前空間しか受け付けないので書くなら必須である一方、精度を持たない
  // 従来の生成物へ付けると意味の無い差分になる。
  const namespace = waypoints.some((wp) => wp.accuracy != null)
    ? ` xmlns:trainlcd="${TRAINLCD_GPX_NS}"`
    : '';

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="TrainLCD scripts/generate-location-gpx.mjs" xmlns="http://www.topografix.com/GPX/1/1"${namespace}>`,
    body,
    '</gpx>',
    '',
  ].join('\n');
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(usage);
    return;
  }

  const apiUrl = args.api ?? process.env.GQL_API_URL ?? DEFAULT_API_URL;

  if (args.listTrainTypes !== undefined) {
    if (!Number.isFinite(args.listTrainTypes)) {
      throw new Error('--list-train-types には駅 ID を指定してください');
    }
    const trainTypes = await fetchStationTrainTypes(
      apiUrl,
      args.listTrainTypes
    );
    for (const t of trainTypes) {
      process.stdout.write(
        `${t.groupId}\t${t.name}\t${t.nameRoman ?? ''}\t${t.line?.nameShort ?? ''}\n`
      );
    }
    return;
  }

  const useLineGroup = args.lineGroup !== undefined;
  if (useLineGroup && args.line !== undefined) {
    process.stderr.write(usage);
    throw new Error('--line と --line-group は同時に指定できません');
  }
  if (!useLineGroup && !Number.isFinite(args.line)) {
    process.stderr.write(usage);
    throw new Error('--line または --line-group が必要です');
  }
  if (useLineGroup && !Number.isFinite(args.lineGroup)) {
    throw new Error('--line-group には種別グループ ID を指定してください');
  }

  const allStations = useLineGroup
    ? await fetchLineGroupStations(apiUrl, args.lineGroup)
    : await fetchLineStations(apiUrl, args.line);

  if (args.list) {
    for (const s of allStations) {
      const extra = useLineGroup
        ? `\t${s.stopCondition ?? ''}\t${s.line?.nameShort ?? ''}`
        : '';
      process.stdout.write(
        `${s.id}\t${s.name}\t${s.nameRoman}\t${s.latitude}, ${s.longitude}${extra}\n`
      );
    }
    return;
  }

  // 種別グループは経路そのものが答えなので、区間指定が無ければ全区間を走らせる。
  const from = Number.isFinite(args.from)
    ? args.from
    : useLineGroup
      ? allStations[0].id
      : Number.NaN;
  const to = Number.isFinite(args.to)
    ? args.to
    : useLineGroup
      ? allStations.at(-1).id
      : Number.NaN;

  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    process.stderr.write(usage);
    throw new Error('--from と --to は必須です');
  }

  // 数値オプションは Number() の結果をそのまま使うため、ここで弾かないと
  // NaN や 0 が速度プロファイル・停車ループへ流れ込み、列車が一切進まない
  // GPX が終了コード 0 で出力されてしまう（壊れていることに気付けない）
  if (!Number.isFinite(args.maxSpeed) || args.maxSpeed <= 0) {
    throw new Error(
      `--max-speed には正の数値を指定してください: ${args.maxSpeed}`
    );
  }
  if (!Number.isFinite(args.dwell) || args.dwell < 0) {
    throw new Error(
      `--dwell には 0 以上の数値を指定してください: ${args.dwell}`
    );
  }
  if (!Object.hasOwn(SIGNAL_PROFILES, args.signalProfile)) {
    throw new Error(
      `--signal-profile には ${SIGNAL_PROFILE_NAMES.join(' / ')} のいずれかを指定してください: ${args.signalProfile}`
    );
  }
  if (args.start !== undefined && !isValidIso8601WithTimezone(args.start)) {
    throw new Error(
      `--start にはタイムゾーン付きの ISO8601 日時を指定してください(例: 2026-01-01T00:00:00Z): ${args.start}`
    );
  }

  const scopeLabel = useLineGroup
    ? `種別グループ ${args.lineGroup}`
    : `路線 ${args.line}`;
  const fromIndex = allStations.findIndex((s) => s.id === from);
  const toIndex = allStations.findIndex((s) => s.id === to);
  if (fromIndex === -1) {
    throw new Error(`始点の駅 ${from} が${scopeLabel}にありません`);
  }
  if (toIndex === -1) {
    throw new Error(`終点の駅 ${to} が${scopeLabel}にありません`);
  }
  if (fromIndex === toIndex) {
    throw new Error('--from と --to が同じ駅です');
  }

  // API の並び順に関わらず、指定された向きで走らせる
  const ordered =
    fromIndex < toIndex
      ? allStations.slice(fromIndex, toIndex + 1)
      : allStations.slice(toIndex, fromIndex + 1).reverse();

  const missingCoords = ordered.filter(
    (s) => s.latitude == null || s.longitude == null
  );
  if (missingCoords.length > 0) {
    throw new Error(
      `座標が欠けている駅があります: ${missingCoords.map((s) => s.name).join(', ')}`
    );
  }

  // 通過駅も経路の折れ点としては残す。除外すると経路が直線に化けて、
  // 通過駅の近傍を通らなくなってしまう
  const skipped = new Set(args.skip);
  const startTime = args.start ?? '2026-01-01T00:00:00Z';
  const needsHolidayCheck =
    useLineGroup &&
    ordered.some(
      (s) => s.stopCondition === 'Weekday' || s.stopCondition === 'Holiday'
    );
  const isHoliday = needsHolidayCheck
    ? await resolveIsHoliday(new Date(Date.parse(startTime)))
    : false;
  const stopIndices = resolveStopIndices({
    route: ordered,
    skippedIds: skipped,
    isHoliday,
  });

  // --subway-lines は subway プロファイルの分類にしか使われない。プロファイルを
  // 付け忘れると、地下扱いにしたつもりの区間が精度も欠測も無いまま出力され、
  // しかも終了コード 0 で成功する。経路外の ID を弾いているのと同じ理由で止める。
  if (args.subwayLines.length > 0 && args.signalProfile !== 'subway') {
    throw new Error(
      `--subway-lines は --signal-profile subway と一緒に指定してください (現在: ${args.signalProfile})`
    );
  }

  const subwayLineIds = new Set(args.subwayLines);

  // --subway-lines に経路外の路線 ID を書いても黙って無視されると、地下扱いに
  // したつもりの区間が地上のまま出てしまう。ID の打ち間違いを検出する。
  const routeLineIds = new Set(
    ordered.map((s) => s.line?.id).filter((id) => id != null)
  );
  const unusedSubwayLines = [...subwayLineIds].filter(
    (id) => !routeLineIds.has(id)
  );
  if (unusedSubwayLines.length > 0) {
    throw new Error(
      `--subway-lines に経路上にない路線 ID が含まれています: ${unusedSubwayLines.join(', ')}`
    );
  }

  // subway は地下を走る区間だけを劣化させるので、地下の駅を 1 つも含まない経路に
  // 当てても地上の精度が付くだけで穴が開かない。黙って「地下鉄の GPX を作った
  // つもり」になるのを防ぐため、その場合だけ知らせる。
  if (
    args.signalProfile === 'subway' &&
    !ordered.some((s) => isUndergroundStation(s, subwayLineIds))
  ) {
    process.stderr.write(
      '警告: --signal-profile subway ですが、経路に地下の駅がありません。欠測は発生しません\n'
    );
  }

  const dense = buildWaypoints({
    route: ordered,
    stopIndices,
    maxSpeedKmh: args.maxSpeed,
    dwellSec: args.dwell,
    subwayLineIds,
  });
  const waypoints = applySignalProfile(dense, args.signalProfile);
  const gpx = toGpx(waypoints, startTime);

  if (args.out) {
    writeFileSync(args.out, gpx, 'utf8');
    const minutes = (waypoints.at(-1).elapsed / 60).toFixed(1);
    process.stderr.write(
      `${args.out} を出力しました (経路 ${ordered.length} 駅 / うち停車 ${stopIndices.length} 駅 / ${waypoints.length} 点 / 約 ${minutes} 分 / 最高 ${args.maxSpeed}km/h)\n`
    );
    if (args.signalProfile === 'subway') {
      // どの路線を地下として扱ったかは生成物から読み取れないので、ここで残す。
      const byLine = new Map();
      for (const st of ordered) {
        if (st.line?.id == null) continue;
        byLine.set(st.line.id, st.line);
      }
      const label = (l) =>
        `${l.nameShort}${isUndergroundStation({ line: l }, subwayLineIds) ? '(地下)' : '(地上)'}`;
      process.stderr.write(
        `区間の扱い: ${[...byLine.values()].map(label).join(' / ')}\n`
      );
    }
    if (waypoints.length !== dense.length) {
      // 落ちた点は「測位が届かない時間」。最長の穴は到着判定の遅れに直結するので、
      // 生成時に見えるようにしておく。
      let longestGapSec = 0;
      for (let i = 1; i < waypoints.length; i++) {
        longestGapSec = Math.max(
          longestGapSec,
          waypoints[i].elapsed - waypoints[i - 1].elapsed
        );
      }
      process.stderr.write(
        `電波プロファイル ${args.signalProfile}: ${dense.length - waypoints.length} 点を欠測として除去 (最長の欠測 ${longestGapSec} 秒)\n`
      );
    }
    // 再生時はアプリを同じ経路に入れておく必要がある。通過駅の index を手で
    // 数え直さずに済むよう、ディープリンクのクエリ部をそのまま出す。
    process.stderr.write(
      `アプリを同じ経路で開くディープリンク: ?${buildDeepLinkQuery(ordered, stopIndices)}\n`
    );
  } else {
    process.stdout.write(gpx);
  }
};

// テストから純粋関数を import できるよう、直接起動されたときだけ main() を走らせる。
// import.meta.main は Node のバージョンによっては undefined になるため、
// どのバージョンでも成立する比較を使う。
const isDirectRun = () => {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
};

if (isDirectRun()) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
