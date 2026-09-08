import {
  TTS_SPEED_PREFERENCE,
  type TTSSpeedPreference,
} from '~/models/TTSSpeed';

// iOS でリモート TTS が使えない回の日本語フォールバックに使う VOICEVOX CORE の既定値。
// 有効化・配信 URL・スタイル ID は Remote Config (voicevox_tts_*_ios) が決める。
// 設計は docs/spec/tts/on-device-tts-ios.md を参照。

// 既定のスタイル ID。No.7「アナウンス」(voicevox_vvm の 6.vvm / スタイル ID 30)。
// 車内放送に最も近い声色で、個人の非商用利用はクレジット表記のみで可
// (https://voiceseven.com/#j0200)。ライセンス画面のクレジットと対応させること。
export const VOICEVOX_DEFAULT_STYLE_ID = 30;

// アナウンス速度設定を VOICEVOX の AudioQuery.speedScale へ写像する。
// リモート TTS の speakingRate (REMOTE_TTS_SPEED_RATES) と同じ倍率にして、
// フォールバック時も設定どおりの速さで読ませる。
export const VOICEVOX_SPEED_SCALES: Record<TTSSpeedPreference, number> = {
  [TTS_SPEED_PREFERENCE.SLOW]: 0.85,
  [TTS_SPEED_PREFERENCE.NORMAL]: 1.0,
  [TTS_SPEED_PREFERENCE.FAST]: 1.15,
};

// 合成に使う CPU スレッド数。0 は VOICEVOX CORE が環境に合わせて決める。
export const VOICEVOX_CPU_NUM_THREADS = 0;

// 辞書・音声モデルの置き場 (Paths.document 配下)。バージョンごとのサブディレクトリを
// 切り、切り替え後に旧バージョンを削除する。
export const VOICEVOX_ASSET_DIR_NAME = 'voicevox';

// マニフェスト取得のタイムアウト(ミリ秒)。資産本体のダウンロードには適用しない。
export const VOICEVOX_MANIFEST_FETCH_TIMEOUT_MS = 15_000;

// 資産の取得に失敗したあと、次に再試行するまでの最短間隔(ミリ秒)。
// 圏外で毎回の放送ごとにマニフェスト取得を試みて電池を消費しないようにする。
export const VOICEVOX_ASSET_RETRY_INTERVAL_MS = 5 * 60_000;

// 同意ダイアログに出す資産サイズの目安 (MB)。実サイズはマニフェスト取得後に分かるため、
// ダイアログでは概算だけを示す (Open JTalk 辞書 約 107MB + VVM 約 55MB)。
export const VOICEVOX_ASSET_APPROX_MB = 160;
