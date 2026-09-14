import { NativeModules, Platform } from 'react-native';

// ios/Modules/VitsTTS の JS 側インターフェース。
// モジュールは本体アプリ (ProdTrainLCD / CanaryTrainLCD) にしか含まれない。App Clip は
// 推論に使う voicevox_onnxruntime.framework を埋め込めない (非圧縮 15MB 制限) ため
// 意図的に含めておらず、Android には実装が無い。呼び出し側は getVitsTtsModule() が
// null を返す構成を「VITS は使えない」として扱い、端末内蔵 TTS へ倒す。

export interface VitsSetupOptions {
  // 音声モデル (ONNX) の絶対パス (file:// を除いたもの)
  modelPath: string;
  // 音素 → トークン ID の対応表
  tokensPath: string;
  // 単語 → 音素列の発音辞書
  lexiconPath: string;
  // 推論に使う CPU スレッド数。0 で自動
  cpuNumThreads: number;
}

export interface VitsSetupResult {
  // モデルの ONNX メタデータから読んだ値。WAV のヘッダーに書く
  sampleRate: number;
  // 音素 ID の間に blank を挟むか (VITS の学習時設定)
  addBlank: boolean;
}

export interface VitsSynthesizeOptions {
  text: string;
  // 速さの倍率 (1.0 が標準)。ネイティブ側が length_scale = 1/speed へ変換する
  speed: number;
  // 書き出す WAV の絶対パス。親ディレクトリは無ければ作られる
  outputPath: string;
}

export interface VitsSynthesizeResult {
  path: string;
  bytes: number;
}

export interface VitsTtsNativeModule {
  setup: (options: VitsSetupOptions) => Promise<VitsSetupResult>;
  synthesize: (options: VitsSynthesizeOptions) => Promise<VitsSynthesizeResult>;
  release: () => Promise<void>;
  // ファイルの SHA-256 (16 進小文字)。100MB 超のモデルを JS へ読み込まずに検証する
  sha256: (path: string) => Promise<string>;
  // iCloud バックアップ対象から外す (再取得できる資産のため)
  setExcludedFromBackup: (path: string) => Promise<void>;
}

const { VitsTTSModule } = NativeModules as {
  VitsTTSModule?: VitsTtsNativeModule;
};

/**
 * VITS のネイティブモジュールを返す。iOS 本体アプリ以外 (Android・App Clip・web) や
 * モジュールが登録されていないビルドでは null で、呼び出し側は VITS を使わない。
 */
export const getVitsTtsModule = (): VitsTtsNativeModule | null => {
  if (Platform.OS !== 'ios') {
    return null;
  }
  return VitsTTSModule ?? null;
};
