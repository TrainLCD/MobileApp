import { atom } from 'jotai';

// 列車の移動フェーズ
export type TrainMotionPhase =
  | 'unknown' // 初期状態/判定不能
  | 'stopped' // 停車中
  | 'accelerating' // 加速中（発車）
  | 'cruising' // 巡行中
  | 'decelerating'; // 減速中（到着）

// 加速度サンプルデータ
export interface AccelerationSample {
  x: number;
  y: number;
  z: number;
  magnitude: number; // 合成加速度
  timestamp: number;
}

// 移動検出状態
export interface TrainMotionState {
  // 現在の移動フェーズ
  phase: TrainMotionPhase;
  // フェーズの信頼度 (0-1)
  confidence: number;
  // 現在のフェーズが開始した時刻
  phaseStartTime: number;
  // 最後に停車を検出した時刻
  lastStopTime: number | null;
  // 検出モードが有効か
  isEnabled: boolean;
  // 検出した停車回数（乗車開始からの累計）
  stopCount: number;
  // デバッグ用: 直近の加速度値
  currentAcceleration: number;
  // デバッグ用: 直近の分散値
  currentVariance: number;
}

// 初期状態
export const initialTrainMotionState: TrainMotionState = {
  phase: 'unknown',
  confidence: 0,
  phaseStartTime: 0,
  lastStopTime: null,
  isEnabled: false,
  stopCount: 0,
  currentAcceleration: 0,
  currentVariance: 0,
};

// メインのatom
export const trainMotionAtom = atom<TrainMotionState>(initialTrainMotionState);

// 停車検出イベント用のatom（停車を検出したときにインクリメント）
export const stationStopDetectedAtom = atom<number>(0);

// 移動検出の有効/無効を切り替えるatom
export const motionDetectionEnabledAtom = atom(
  (get) => get(trainMotionAtom).isEnabled,
  (get, set, enabled: boolean) => {
    const current = get(trainMotionAtom);
    set(trainMotionAtom, {
      ...current,
      isEnabled: enabled,
      // 無効化時は全状態をリセット
      ...(enabled
        ? {}
        : {
            phase: 'unknown',
            confidence: 0,
            stopCount: 0,
            phaseStartTime: 0,
            lastStopTime: null,
            currentAcceleration: 0,
            currentVariance: 0,
          }),
    });
  }
);

// リセット用のatom
export const resetTrainMotionAtom = atom(null, (_get, set) => {
  set(trainMotionAtom, initialTrainMotionState);
  set(stationStopDetectedAtom, 0);
});
