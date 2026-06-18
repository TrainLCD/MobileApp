/**
 * Azure Speech のニューラルボイス名を扱うユーティリティ。
 *
 * Azure のボイス id は `<locale>-<Name>Neural` 形式（例: `ja-JP-NanamiNeural`,
 * `en-US-JennyNeural`, `en-US-AvaMultilingualNeural`）。Google の Standard/WaveNet の
 * ような価格差はなく、ニューラルが標準ティアのため「コストガード」は不要だが、
 * クライアントから任意文字列が渡るため最低限の妥当性チェックは行う。
 */
// 標準ニューラル（ja-JP-NanamiNeural）と HD ボイス（ja-JP-Nanami:DragonHDLatestNeural）の両方を許可
const AZURE_VOICE_PATTERN = /^[a-z]{2,3}-[A-Za-z]+-[A-Za-z0-9:]+Neural$/;

export const isAzureVoiceName = (voiceName: string): boolean =>
  AZURE_VOICE_PATTERN.test(voiceName);

// HD（DragonHD）ボイス判定。HD ボイスは id に `:DragonHD...Neural` を含む
// （例: `ja-JP-Nanami:DragonHDLatestNeural`, `en-US-Jenny:DragonHDLatestNeural`）。
// HD は <prosody> と <mstts:express-as> を非対応のため、SSML 構築時に
// 未サポート要素を出し分ける用途で使う。
const AZURE_HD_VOICE_PATTERN = /:DragonHD[A-Za-z0-9]*Neural$/i;

export const isAzureHdVoiceName = (voiceName: string): boolean =>
  AZURE_HD_VOICE_PATTERN.test(voiceName);

export const resolveAzureVoiceName = (
  requestedVoiceName: unknown,
  configuredVoiceName: unknown,
  defaultVoiceName: string
): string => {
  const requested =
    typeof requestedVoiceName === 'string' ? requestedVoiceName.trim() : '';
  if (requested && isAzureVoiceName(requested)) {
    return requested;
  }

  const configured =
    typeof configuredVoiceName === 'string' ? configuredVoiceName.trim() : '';
  if (configured && isAzureVoiceName(configured)) {
    return configured;
  }

  return defaultVoiceName;
};
