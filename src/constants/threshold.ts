// 閾値
// 「まもなく」を出す距離の上限。駅間距離/2 がこれを超える長い駅間でだけ効く。
// 130km/h・減速度0.69m/s²(室蘭本線の特急)ではブレーキを踏み始める点が駅の約945m手前で、
// 1000mでは到着約54秒前と減速開始とほぼ同時になっていた。2000mで到着約81秒前となり、
// ETA版の接近リード上限(APPROACH_LEAD_MAX_MIN = 1.5分)を超えない。
export const APPROACHING_MAX_THRESHOLD = 2000;
export const APPROACHING_MIN_THRESHOLD = 200;
export const ARRIVED_MAX_THRESHOLD = 200;
export const ARRIVED_MIN_THRESHOLD = 75;
export const MANY_LINES_THRESHOLD = 7;
export const OMIT_JR_THRESHOLD = 3; // これ以上JR線があったら「JR線」で省略しよう
export const JR_LINE_MAX_ID = 6;
export const BAD_ACCURACY_THRESHOLD = 200; // m
