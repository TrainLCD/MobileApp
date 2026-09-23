/**
 * 補完測位(useLocationHeartbeat)の稼働状態と要求結果を数える。DevOverlayの診断表示専用で、
 * 補完測位の判定には一切使わない。
 *
 * locationPipelineStats が数えるのは「handleTrackingLocation / setLocation へ届いた測位」で、
 * 補完測位が測位を一件も得られなければどのカウンタも動かない。そのため測位が途絶えた区間で
 * 「補完測位が要求を出していないのか」「要求は出ているが得られていないのか」を、既存の内訳
 * からは区別できない。地下ではまさにそこが分かれ目になるので、要求を出す側でも数える。
 *
 * 成功した要求は handleTrackingLocation を通るので locationPipelineStats にも現れる。両者は
 * 母集団が違い(あちらは継続測位の配信も含む)、合計が一致することはない。
 *
 * isDevApp や Remote Config で分岐させない。カナリアやフラグでだけ通る経路を測位まわりへ
 * 作ると、本番と挙動が違うことを忘れたまま次の変更を重ねることになる。ここで行うのは整数の
 * インクリメントと文字列の差し替えだけで、atom を書かないため購読側の再レンダーも起きない。
 */

/**
 * 補完測位が動いているか、動いていないなら何が止めているか。
 *
 * 要求数が 0 のとき、それが「途絶が無くて出す必要がなかった」のか「そもそも動いていない」の
 * かは数だけでは読めない。止めている条件は useLocationHeartbeat の早期 return にしか無いので、
 * 判定したその場で記録する。
 */
export type LocationHeartbeatState =
  /** フックが動いていない(初期値。ホストが未マウント、または画面を離れた) */
  | 'not-mounted'
  /** このプラットフォームでは補完測位が不要(NEEDS_LOCATION_HEARTBEAT が偽) */
  | 'unnecessary'
  /** オートモード中(現在地はシミュレーターが直接書くので実測位を混ぜない) */
  | 'auto-mode'
  /** 背景(背景では正常時も配信間隔が空き、途絶と区別できない) */
  | 'app-background'
  /** 省電力測位プロファイル中(停車中の測位休止を打ち消さないため動かさない) */
  | 'power-saving'
  /** 前景の位置情報権限が無い、または権限の確認自体に失敗した */
  | 'permission-denied'
  /** 動作条件を満たし、途絶の点検を回している */
  | 'running';

export type LocationHeartbeatStats = {
  state: LocationHeartbeatState;
  /** 一発取得を要求した回数 */
  requested: number;
  /** 測位が返り、handleTrackingLocation へ渡した回数 */
  succeeded: number;
  /** 取得が失敗して返った回数 */
  failed: number;
  /** 応答が返らないまま LOCATION_HEARTBEAT_MAX_PENDING で見切った回数 */
  abandoned: number;
  /**
   * 進行中のまま捨てた要求の回数。画面を離れたときと、稼働条件から外れて
   * useLocationHeartbeat の effect が張り直されたときに起きる。
   *
   * 捨てた要求はどの結果カウンタにも現れない。数えないと requested だけが進んで
   * succeeded/failed/abandoned が揃って 0 のダンプになり、「応答が返っていない」のか
   * 「返る前に捨てた」のかが読めなくなる。
   */
  discarded: number;
  /**
   * useLocationHeartbeat の片付けが走った回数。依存の変化による張り直しと、画面を
   * 離れたときのアンマウントの両方を含む。
   *
   * 進行中の要求は張り直しで捨てられる(discarded)。張り直しがどれだけ起きているかは
   * 補完測位が進まない理由の手掛かりになるので、捨てた数と並べて読めるようにする。
   */
  teardowns: number;
  /**
   * 直近の張り直しの理由(古いものが先頭、最大 MAX_TEARDOWN_REASONS 件)。
   * 「どの依存が変わったか」と「そのときの AppState」を1件ずつ文字列で持つ。
   *
   * 回数(teardowns)だけでは引き金が読めない。前景判定が外れたのか、省電力へ切り替わった
   * のか、ホストが作り直されただけなのかで、次に直す場所がまるで変わる。数だけを見て
   * 引き金を推測すると外すので、理由そのものを残す。
   *
   * 理由は張り直したあとの実行で記録する(前回の依存と突き合わせて初めて差分が出る)。
   * 画面を離れたときのアンマウントは次の実行が無いため、teardowns だけが進んで理由は
   * 増えない。
   */
  recentTeardownReasons: string[];
  /**
   * 直近の取得失敗の内容。失敗が地下で連続するとき、ログを追わずに理由を持ち出せるようにする。
   * 長い文字列がダンプを埋めないよう切り詰める。
   */
  lastErrorMessage: string | null;
};

// 配信と見切りがほぼ同時に起きたときだけ、同じ要求で succeeded と abandoned の両方が
// 立ちうる。requested と内訳の合計は一致しない前提で読むこと。
const createStats = (): LocationHeartbeatStats => ({
  state: 'not-mounted',
  requested: 0,
  succeeded: 0,
  failed: 0,
  abandoned: 0,
  discarded: 0,
  teardowns: 0,
  recentTeardownReasons: [],
  lastErrorMessage: null,
});

// 残す理由の件数。乗車1回ぶんの張り直しを追うには数件あれば足り、ダンプを
// 埋めない程度に抑える。
const MAX_TEARDOWN_REASONS = 5;

let stats = createStats();

const MAX_ERROR_MESSAGE_LENGTH = 200;

const toErrorMessage = (error: unknown): string => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);
  return message.slice(0, MAX_ERROR_MESSAGE_LENGTH);
};

export const setLocationHeartbeatState = (
  state: LocationHeartbeatState
): void => {
  stats.state = state;
};

export const countLocationHeartbeatRequested = (): void => {
  stats.requested += 1;
};

export const countLocationHeartbeatSucceeded = (): void => {
  stats.succeeded += 1;
};

export const countLocationHeartbeatFailed = (error: unknown): void => {
  stats.failed += 1;
  stats.lastErrorMessage = toErrorMessage(error);
};

export const countLocationHeartbeatAbandoned = (): void => {
  stats.abandoned += 1;
};

export const countLocationHeartbeatDiscarded = (): void => {
  stats.discarded += 1;
};

export const countLocationHeartbeatTornDown = (): void => {
  stats.teardowns += 1;
};

export const recordLocationHeartbeatTeardownReason = (reason: string): void => {
  // 差し替えで足す。getLocationHeartbeatStats が返した配列は浅いコピーで共有される
  // ため、既に持ち出されたダンプを後から書き換えないようにする。
  stats.recentTeardownReasons = [
    ...stats.recentTeardownReasons,
    reason.slice(0, MAX_ERROR_MESSAGE_LENGTH),
  ].slice(-MAX_TEARDOWN_REASONS);
};

export const getLocationHeartbeatStats = (): LocationHeartbeatStats => ({
  ...stats,
  recentTeardownReasons: [...stats.recentTeardownReasons],
});

/**
 * テスト用: 集計をすべて初期化する。
 *
 * locationPipelineStats と違って resetLocationState(store/atoms/location.ts)からは呼ばない。
 * あちらは測位パイプラインの状態で、こちらは補完測位フックの稼働記録という別系統であり、
 * atom 側がフックの集計を知る筋合いが無い。必要なテストがそれぞれ呼ぶ。
 */
export const resetLocationHeartbeatStats = (): void => {
  stats = createStats();
};
