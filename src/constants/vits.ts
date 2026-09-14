import {
  TTS_SPEED_PREFERENCE,
  type TTSSpeedPreference,
} from '~/models/TTSSpeed';

// iOS でリモート TTS が使えない回の英語フォールバックに使う VITS (端末内合成) の既定値。
// 有効化・配信 URL は Remote Config (vits_tts_*_ios) が決める。
// 設計は docs/spec/tts/on-device-tts-ios.md を参照。

// アナウンス速度設定を VITS の length_scale へ写像する。length_scale は「1 音素あたりの
// 長さの倍率」なので、倍率が大きいほど遅くなる。ここでは speak 側が 1/speed を渡す前提で、
// VOICEVOX の speedScale (VOICEVOX_SPEED_SCALES) やリモート TTS の speakingRate
// (REMOTE_TTS_SPEED_RATES) と同じ「速さの倍率」で保持する。
export const VITS_SPEED_RATES: Record<TTSSpeedPreference, number> = {
  [TTS_SPEED_PREFERENCE.SLOW]: 0.85,
  [TTS_SPEED_PREFERENCE.NORMAL]: 1.0,
  [TTS_SPEED_PREFERENCE.FAST]: 1.15,
};

// 合成に使う CPU スレッド数。0 は ONNX Runtime が環境に合わせて決める。
export const VITS_CPU_NUM_THREADS = 0;

// 音声モデル・辞書の置き場 (Paths.document 配下)。バージョンごとのサブディレクトリを
// 切り、切り替え後に旧バージョンを削除する。
export const VITS_ASSET_DIR_NAME = 'vits';

// マニフェスト取得のタイムアウト(ミリ秒)。資産本体のダウンロードには適用しない。
export const VITS_MANIFEST_FETCH_TIMEOUT_MS = 15_000;

// 資産の取得に失敗したあと、次に再試行するまでの最短間隔(ミリ秒)。
// 圏外で毎回の放送ごとにマニフェスト取得を試みて電池を消費しないようにする。
export const VITS_ASSET_RETRY_INTERVAL_MS = 5 * 60_000;

// 同意ダイアログに出す資産サイズの目安 (MB)。実サイズはマニフェスト取得後に分かるため、
// ダイアログでは概算だけを示す (モデル 約 114MB + 発音辞書 約 4MB)。
export const VITS_ASSET_APPROX_MB = 118;
