/**
 * 経過時間の計測にだけ使う時計(ms)。値そのものに意味は無く、差分だけを使う。
 *
 * `Date.now()`は端末の時計なので、ネットワーク同期や手動変更で前後へ飛ぶ。「最後に
 * 配信を処理してから何秒経ったか」の判定に使うと、巻き戻しでは判定が凍り(残り時間が
 * 巻き戻し幅ぶん伸びる)、進みでは保留中の要求を早く見切って重複要求を出す。
 * `performance.now()`はプロセス開始からの経過なので、時計の変更に影響されない。
 *
 * React Nativeは`global.performance`を必ず用意する(ネイティブ実装が無い環境では
 * `Date.now`へフォールバックする実装を入れる)。そのフォールバックが効いた環境では
 * 単調性が保証されないため、呼び出し側は経過時間が負になりうる前提を残しておくこと。
 */
export const monotonicNow = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
