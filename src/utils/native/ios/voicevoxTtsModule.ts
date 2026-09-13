import { NativeModules, Platform } from 'react-native';

// ios/Modules/VoicevoxTTS の JS 側インターフェース。
// モジュールは本体アプリ (ProdTrainLCD / CanaryTrainLCD) にしか含まれない。App Clip は
// 依存する xcframework を埋め込めない (非圧縮 15MB 制限) ため意図的に含めておらず、
// Android には実装が無い。呼び出し側は getVoicevoxTtsModule() が null を返す構成を
// 「VOICEVOX は使えない」として扱い、端末内蔵 TTS へ倒す。

export interface VoicevoxSetupOptions {
  // Open JTalk 辞書ディレクトリ (file:// を除いた絶対パス)
  openJtalkDicDir: string;
  // 読み込む音声モデル (VVM) の絶対パス
  voiceModelPaths: string[];
  // 合成に使う CPU スレッド数。0 で自動
  cpuNumThreads: number;
}

export interface VoicevoxSetupResult {
  coreVersion: string;
  // 読み込んだ音声モデルに含まれるスタイル ID
  styleIds: number[];
}

export interface VoicevoxSynthesizeOptions {
  text: string;
  styleId: number;
  // AudioQuery.speedScale (1.0 が標準)
  speedScale: number;
  // 書き出す WAV の絶対パス。親ディレクトリは無ければ作られる
  outputPath: string;
}

export interface VoicevoxSynthesizeResult {
  path: string;
  bytes: number;
}

export interface VoicevoxTtsNativeModule {
  setup: (options: VoicevoxSetupOptions) => Promise<VoicevoxSetupResult>;
  synthesize: (
    options: VoicevoxSynthesizeOptions
  ) => Promise<VoicevoxSynthesizeResult>;
  release: () => Promise<void>;
  // ファイルの SHA-256 (16 進小文字)。100MB 超の辞書を JS へ読み込まずに検証する
  sha256: (path: string) => Promise<string>;
  // iCloud バックアップ対象から外す (再取得できる資産のため)
  setExcludedFromBackup: (path: string) => Promise<void>;
}

const { VoicevoxTTSModule } = NativeModules as {
  VoicevoxTTSModule?: VoicevoxTtsNativeModule;
};

/**
 * VOICEVOX のネイティブモジュールを返す。iOS 本体アプリ以外 (Android・App Clip・web) や
 * モジュールが登録されていないビルドでは null で、呼び出し側は VOICEVOX を使わない。
 */
export const getVoicevoxTtsModule = (): VoicevoxTtsNativeModule | null => {
  if (Platform.OS !== 'ios') {
    return null;
  }
  return VoicevoxTTSModule ?? null;
};
