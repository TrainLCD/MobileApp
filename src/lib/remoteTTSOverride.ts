import { STORAGE_KEYS } from '~/constants/storage';
import { isDevApp } from '~/utils/isDevApp';
import { storage } from './storage';

/**
 * 試験的機能: リモートTTS(Worker の /tts 経由で Google Cloud TTS を利用)を使うか
 * どうかを Remote Config より優先して端末側で固定するための上書き設定。
 *
 * 'auto' は上書きなし(Remote Config の remote_tts_enabled_* に従う)、'on' / 'off' は
 * 配信値を無視して強制する。エンジンの切り替えを実機で確かめるための開発・検証用途で、
 * 特に Android の 'on' は文字数課金が発生する経路を有効化するため、設定画面の導線と
 * 併せて dev アプリ(カナリア)限定で機能する。
 */
export const REMOTE_TTS_OVERRIDE = {
  AUTO: 'auto',
  ON: 'on',
  OFF: 'off',
} as const;

export type RemoteTTSOverride =
  (typeof REMOTE_TTS_OVERRIDE)[keyof typeof REMOTE_TTS_OVERRIDE];

const isRemoteTTSOverride = (value: unknown): value is RemoteTTSOverride =>
  value === REMOTE_TTS_OVERRIDE.AUTO ||
  value === REMOTE_TTS_OVERRIDE.ON ||
  value === REMOTE_TTS_OVERRIDE.OFF;

// isRemoteTTSEnabled は放送のたびに呼ばれるホットパスのため、MMKV は初回だけ読んで
// 以降はモジュール内のキャッシュを返す。null は「未読み込み」を表す。
let cachedOverride: RemoteTTSOverride | null = null;

const listeners = new Set<() => void>();

// 上書き設定の変更をUIへ購読させる。戻り値は購読解除関数(useSyncExternalStore 互換)。
export const subscribeRemoteTTSOverride = (
  listener: () => void
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

/**
 * 現在の上書き設定を同期的に取得する。本番ビルドでは設定画面の導線自体が無いが、
 * カナリアで書き込んだ値が何らかの経路で残っていても効かないよう、常に 'auto' を返す。
 */
export const getRemoteTTSOverride = (): RemoteTTSOverride => {
  if (!isDevApp) {
    return REMOTE_TTS_OVERRIDE.AUTO;
  }
  if (cachedOverride != null) {
    return cachedOverride;
  }
  try {
    const stored = storage.getString(STORAGE_KEYS.REMOTE_TTS_OVERRIDE);
    cachedOverride = isRemoteTTSOverride(stored)
      ? stored
      : REMOTE_TTS_OVERRIDE.AUTO;
  } catch (error) {
    // 読み取りに失敗しても上書きなしとして動作を継続する(次回呼び出しで再試行)。
    console.error('Failed to read remote TTS override', error);
    return REMOTE_TTS_OVERRIDE.AUTO;
  }
  return cachedOverride;
};

/**
 * 上書き設定を保存する。保存に失敗した場合はキャッシュを更新せず例外を再送出し、
 * 呼び出し側(設定画面)がUIをロールバックしてエラーを通知できるようにする。
 */
export const setRemoteTTSOverride = (value: RemoteTTSOverride): void => {
  storage.set(STORAGE_KEYS.REMOTE_TTS_OVERRIDE, value);
  cachedOverride = value;
  notifyListeners();
};

// テスト用。永続値とキャッシュの両方を初期状態へ戻す。
// 購読者への通知は行わない。テストの後片付けでマウント済みの画面を再描画させると
// act() の外での更新になるため、値のリセットだけに留める。
export const resetRemoteTTSOverrideForTests = (): void => {
  cachedOverride = null;
  storage.remove(STORAGE_KEYS.REMOTE_TTS_OVERRIDE);
};
