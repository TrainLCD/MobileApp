import type * as Location from 'expo-location';
import type { Station } from '~/@types/graphql';
import type { EtaAnchor, EtaPhase } from './etaFallback';

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
  /** 表示に使っている速度(m/s)と、それが実測かどうか */
  effectiveSpeedMps: number;
  hasMeasuredSpeed: boolean;
  maxPermitAccuracy: number;
  etaAssistEnabled: boolean;
  etaPhase: EtaPhase | null;
  etaAnchor: EtaAnchor | null;
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
    autoModeEnabled: input.autoModeEnabled,
    telemetryEnabled: input.telemetryEnabled,
    backgroundLocationTracking: input.backgroundLocationTracking,
  },
  location: {
    raw: toCoordsSnapshot(input.rawLocation),
    filtered: toCoordsSnapshot(input.filteredLocation),
    accuracyHistory: input.accuracyHistory,
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
  },
  eta: {
    phase: input.etaPhase,
    anchor: input.etaAnchor,
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
