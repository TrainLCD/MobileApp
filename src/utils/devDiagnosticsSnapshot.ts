import type * as Location from 'expo-location';
import type { Station } from '~/@types/graphql';
import type { EtaAnchor, EtaPhase } from './etaFallback';
import type { LocationPipelineCounts } from './locationPipelineStats';

/**
 * DevOverlay が表示している診断値を、そのまま貼り付けられる JSON へ組み立てる。
 *
 * 画面の数値を読み上げてもらう代わりに、判断に要る値を丸ごと持ち出せるようにするのが目的。
 * 画面には出していない実効設定(リモート設定の値・プラットフォーム)も含める。設定が
 * 分からないと同じ測位でも挙動を説明できないため、座標だけ持ち出しても再現できない。
 *
 * ここで持ち出せるのは「その瞬間のスナップショット」であって、棄却された測位の履歴や
 * 測位の出所(継続測位/補完測位)ではない。それらは setLocation / handleTrackingLocation の
 * 判定箇所に記録を足さないと取れないので、本関数の対象外。
 */

export type DevDiagnosticsInput = {
  /** 生成時刻(ms)。呼び出し側から渡してレンダーの純粋性を保つ */
  nowMs: number;
  appVersion: string;
  buildNumber: string;
  /** canary(開発ビルド)か production か */
  channel: 'canary' | 'production';
  platform: string;
  osVersion: string | number;
  autoModeEnabled: boolean;
  telemetryEnabled: boolean;
  backgroundLocationTracking: boolean;
  /** 継続測位の生の値(フィルタ前) */
  rawLocation: Location.LocationObject | null;
  /** フィルタ・スムージングを通した、アプリが現在地として使っている値 */
  filteredLocation: Location.LocationObject | null;
  /**
   * DevOverlay のチャートが持つ精度履歴(古い順)。1秒ごとのサンプリングで、
   * 測位が無い間は NaN が積まれる(JSONでは null になる)。見た目の推移用。
   */
  accuracyHistory: number[];
  /**
   * 平滑化の要否(isAccuracyStable)を決めている accuracyHistoryAtom の中身。
   * 測位を受理するたびに積まれ、無効値は捨てられるのでチャート用とは別物。
   * 地下鉄分岐に入っているかを説明できるのはこちらなので、必ず一緒に持ち出す。
   */
  filterAccuracyHistory: number[];
  /**
   * 直近の測位が地下鉄分岐(平滑化スキップ)を通ったか。次の lineType と
   * 対で受け取ること。どちらも smoothingDecisionAtom が同じ判定時に書いた値で、
   * 片方を stationAtom から読み直すと別の瞬間の値が混ざる。
   */
  skipSmoothing: boolean;
  /** 上の判定に使った路線種別(判定時の値) */
  lineType: string | null;
  /**
   * 継続測位で届いた連続する入力座標の距離(m)。精度フィルタで棄却された測位も含むので、
   * 「位置が飛び続けているのか、一点だけ外れたのか」が棄却ぶんまで読める。
   *
   * filterAccuracyHistory とは母集団が違う。あちらは setLocation へ到達した測位で、
   * 精度フィルタを通過した継続測位に加え、フィルタを経由しない手動選択・ワンショット
   * 取得も含む(精度を持たない測位は積まれない)。両方を並べると「棄却された測位が
   * 飛んでいたのか」が分かる一方、index は対応しないので突き合わせて読まないこと。
   */
  displacementHistory: number[];
  /**
   * 直近の継続測位が最大許容精度フィルタで棄却されたか(locationAccuracyOutlierAtom)。
   * 到着判定の強制未到着分岐を直接ゲートするので、判定の説明に要る。
   */
  accuracyOutlier: boolean;
  /**
   * 測位1件ごとの処理結果の内訳。どの門で何件落ちたかを数えたもの。
   * プロセス起動からの累積で、路線を選び直しても戻らない(「今回の乗車ぶん」ではない)。
   * 2枚のダンプを撮れば差分で区間ごとの内訳が読める。
   */
  pipelineCounts: LocationPipelineCounts;
  /** 表示に使っている速度(m/s)と、それが実測かどうか */
  effectiveSpeedMps: number;
  hasMeasuredSpeed: boolean;
  maxPermitAccuracy: number;
  etaAssistEnabled: boolean;
  /**
   * 精度が最大許容精度を超えたとき到着判定を強制的に未到着へ倒す機能の有効/無効。
   * 精度が上限を超えて棄却された測位では、このフラグの有無で到着判定の読み方が
   * 変わるため、他の実効設定と同じく座標とセットで持ち出す。
   */
  forceNotArrivedOnLowAccuracy: boolean;
  etaPhase: EtaPhase | null;
  etaAnchor: EtaAnchor | null;
  /** 最後に到着確定した駅(stationState.station)。全判定の起点 */
  currentStation: Station | null | undefined;
  /** 到着中か(stationState.arrived) */
  arrived: boolean;
  /** 接近中か(stationState.approaching)。次駅表示の分岐を決める */
  approaching: boolean;
  /**
   * 現在地に最も近い駅(useNearestStation)と、そこまでの距離(m)。
   * 到着判定の対象そのもので、表示上の次駅(nextStation)とは別物。
   *
   * 距離は到着判定(isPointWithinRadius)と同じ 0.01m 精度で求める。既定の 1m 丸めだと
   * 閾値ぎりぎりのとき arrivedThreshold との大小がダンプ上だけ逆に見える。
   * 判定は `distanceToNearestStation < arrivedThreshold` (strict) で行われる。
   */
  nearestStation: Station | null | undefined;
  distanceToNearestStation: number | null;
  /** 精度ボーナスを加えた実効到着圏(m) */
  arrivedThreshold: number;
  /** 精度ボーナスを加えた実効接近圏(m) */
  approachingThreshold: number;
  nextStation: Station | null | undefined;
  /**
   * 次駅までの距離。useDistanceToNextStation は表示用に桁区切りした文字列
   * (測位が無いときは 0)を返すので、型もそれに合わせる。ここで数値へ直すと
   * フックの算出と二重に持つことになるため、表示値をそのまま持ち出す。
   */
  distanceToNextStation: string | number | null | undefined;
};

type CoordsSnapshot = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
  timestamp: number | null;
  timestampISO: string | null;
} | null;

/**
 * ミリ秒をISO文字列にする。値が無い・不正なら null を返す。
 *
 * 診断情報の持ち出しで例外を出すわけにはいかない。Date は不正な値へ toISOString すると
 * 送出するので、ここで必ず止める。OSやシミュレーションの経路によっては timestamp を
 * 持たない測位が届きうる。
 */
const toISOStringOrNull = (ms: number | null | undefined): string | null => {
  if (ms == null || !Number.isFinite(ms)) {
    return null;
  }
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toCoordsSnapshot = (
  location: Location.LocationObject | null
): CoordsSnapshot => {
  if (!location) {
    return null;
  }
  return {
    latitude: location.coords?.latitude ?? null,
    longitude: location.coords?.longitude ?? null,
    accuracy: location.coords?.accuracy ?? null,
    speed: location.coords?.speed ?? null,
    timestamp: location.timestamp ?? null,
    timestampISO: toISOStringOrNull(location.timestamp),
  };
};

export const buildDevDiagnosticsSnapshot = (input: DevDiagnosticsInput) => ({
  capturedAt: toISOStringOrNull(input.nowMs),
  build: {
    appVersion: `${input.appVersion}(${input.buildNumber})`,
    channel: input.channel,
    platform: input.platform,
    osVersion: String(input.osVersion),
  },
  // 実効設定。同じ測位でもこれが違えば挙動が変わるので、座標と必ずセットで持ち出す
  config: {
    maxPermitAccuracy: input.maxPermitAccuracy,
    etaAssistEnabled: input.etaAssistEnabled,
    forceNotArrivedOnLowAccuracy: input.forceNotArrivedOnLowAccuracy,
    autoModeEnabled: input.autoModeEnabled,
    telemetryEnabled: input.telemetryEnabled,
    backgroundLocationTracking: input.backgroundLocationTracking,
  },
  location: {
    raw: toCoordsSnapshot(input.rawLocation),
    filtered: toCoordsSnapshot(input.filteredLocation),
    accuracyHistory: input.accuracyHistory,
    displacementHistory: input.displacementHistory,
    effectiveSpeedMps: input.effectiveSpeedMps,
    // 変位から算出した値か、測位が運んできた実測かを区別する
    speedIsMeasured: input.hasMeasuredSpeed,
  },
  // どちらの経路を通ったかと、その判定材料。locationAtomの値だけでは
  // 平滑化を掛けたのか生の座標を入れたのかが区別できない。
  filter: {
    skipSmoothing: input.skipSmoothing,
    lineType: input.lineType,
    accuracyHistory: input.filterAccuracyHistory,
    accuracyOutlier: input.accuracyOutlier,
    counts: input.pipelineCounts,
  },
  eta: {
    phase: input.etaPhase,
    anchor: input.etaAnchor,
  },
  // GPSが下している判定そのもの。座標と閾値だけでは、どの駅を対象にどう判定したかが
  // 逆算になり、直通運転では逆算が成り立たない。
  state: {
    currentStationId: input.currentStation?.id ?? null,
    currentStationName: input.currentStation?.name ?? null,
    arrived: input.arrived,
    approaching: input.approaching,
    nearestStationId: input.nearestStation?.id ?? null,
    nearestStationName: input.nearestStation?.name ?? null,
    distanceToNearestStation: input.distanceToNearestStation,
    arrivedThreshold: input.arrivedThreshold,
    approachingThreshold: input.approachingThreshold,
  },
  derived: {
    nextStationId: input.nextStation?.id ?? null,
    nextStationName: input.nextStation?.name ?? null,
    distanceToNextStation: input.distanceToNextStation ?? null,
  },
});

/** クリップボードへ載せる文字列。読みながら貼れるよう整形する */
export const formatDevDiagnosticsSnapshot = (
  input: DevDiagnosticsInput
): string => JSON.stringify(buildDevDiagnosticsSnapshot(input), null, 2);
