import type * as Location from 'expo-location';
import type { Line, Station } from '~/@types/graphql';
import type { LineDirection } from '~/models/Bound';

/** GPSログバッファに蓄積される1ポイント */
export type LocationLog = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number; // ms
  speed: number | null; // m/s (expo-location由来)
};

/** Phase 1 出力: フィルタ済みログ */
export type FilteredLocationLog = LocationLog & {
  /** 直前のログ点からの距離 (m) */
  distFromPrev: number;
  /** 直前のログ点からの経過時間 (s) */
  dtFromPrev: number;
};

/** Phase 2 出力: 候補路線（GraphQLデータ付き） */
export type CandidateLine = {
  line: Line;
  stations: Station[];
};

/** Phase 3 のサブスコア詳細（デバッグ表示用） */
export type ScoreBreakdown = {
  routeFitScore: number;
  orderScore: number;
  speedScore: number;
};

/** Phase 3 出力: スコア付き路線 */
export type ScoredLine = CandidateLine & {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  /** 各ログ点の最寄り駅インデックス列（方向推定に再利用） */
  visitedIndices: number[];
};

/** Phase 4+5 出力: 最終候補 */
export type RouteCandidate = {
  line: Line;
  direction: LineDirection;
  currentStation: Station;
  /** 次の停車駅。全後続駅が通過の場合は null */
  nextStation: Station | null;
  boundStation: Station;
  stations: Station[];
  score: number;
  confidence: number;
  scoreBreakdown: ScoreBreakdown;
};

/** 推定状態 */
export type EstimationStatus = 'idle' | 'collecting' | 'estimating' | 'ready';

/** useRouteEstimation フックの返り値 */
export type EstimationResult = {
  status: EstimationStatus;
  candidates: RouteCandidate[];
  selectCandidate: (candidate: RouteCandidate) => void;
  reset: () => void;
  /** デバッグ用: 現在のバッファ情報 */
  bufferInfo: {
    pointCount: number;
    totalDistance: number;
    avgSpeed: number;
    isMoving: boolean;
  };
};

/** ログバッファから LocationLog を生成するユーティリティ */
export const toLocationLog = (loc: Location.LocationObject): LocationLog => ({
  latitude: loc.coords.latitude,
  longitude: loc.coords.longitude,
  accuracy: loc.coords.accuracy,
  timestamp: loc.timestamp,
  speed: loc.coords.speed,
});
