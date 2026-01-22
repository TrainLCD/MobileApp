// 加速度センサーによる列車移動検出の定数

// サンプリング設定
export const ACCELEROMETER_UPDATE_INTERVAL_MS = 100; // 100ms = 10Hz
export const MOTION_SAMPLE_WINDOW_SIZE = 50; // 5秒間のサンプル (50 * 100ms)
export const STOP_DETECTION_WINDOW_SIZE = 30; // 停車検出用の3秒ウィンドウ

// 移動状態検出の閾値
// 列車の加速度は通常 0.5〜1.5 m/s² 程度
export const ACCELERATION_THRESHOLD = 0.2; // m/s² - これ以上の加速度で「移動中」と判定
export const STOP_ACCELERATION_THRESHOLD = 0.12; // m/s² - これ以下で「停車中」と判定
export const DECELERATION_THRESHOLD = -0.15; // m/s² - これ以下で「減速中」と判定

// 分散（振動）の閾値
export const MOVING_VARIANCE_THRESHOLD = 0.03; // 走行中の振動は一定以上
export const STOPPED_VARIANCE_THRESHOLD = 0.008; // 停車中の振動は低い

// 分散の安定性（分散自体の変動を見る）
export const VARIANCE_STABILITY_THRESHOLD = 0.015; // 分散の変動がこれ以下なら安定

// 状態遷移の安定性
export const MIN_SAMPLES_FOR_STATE_CHANGE = 15; // 状態変化に必要な連続サンプル数（増加）
export const MIN_STABLE_DURATION_MS = 3000; // 状態が安定していると判断する最小時間
export const STOP_CONFIRMATION_DURATION_MS = 3000; // 停車確定に必要な継続時間（増加）
export const DEPARTURE_CONFIRMATION_DURATION_MS = 2000; // 発車確定に必要な継続時間（増加）

// 駅到着推定
export const STATION_STOP_MIN_DURATION_MS = 15000; // 駅停車の最小時間 (15秒)
export const STATION_STOP_MAX_DURATION_MS = 180000; // 駅停車の最大時間 (3分)

// 重力加速度の除去
export const GRAVITY = 9.81; // m/s²

// ローパスフィルタ係数 (ノイズ除去用)
export const LOW_PASS_FILTER_ALPHA = 0.8;

// GPS精度が悪いと判断する閾値
export const POOR_GPS_ACCURACY_THRESHOLD = 100; // m - これ以上でオフラインモード推奨
