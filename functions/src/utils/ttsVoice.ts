/**
 * AWS Polly のボイス id を扱うユーティリティ。
 *
 * Polly のボイス id は PascalCase の単語（例: `Kazuha`, `Tomoko`, `Takumi`,
 * `Joanna`, `Matthew`）。Azure と異なりロケールを id に埋め込まないため、
 * 既知のボイス id の許可リストで妥当性を判定する。クライアントからは任意文字列が
 * 渡るため、未知の id は弾いて設定値・既定値へフォールバックする。
 */
// Polly の主要なニューラル対応ボイス id（ja-JP / en-US）。新ボイス追加時はここに足す。
const KNOWN_AWS_VOICES = new Set<string>([
  // ja-JP
  'Mizuki',
  'Takumi',
  'Kazuha',
  'Tomoko',
  // en-US
  'Ivy',
  'Joanna',
  'Kendra',
  'Kimberly',
  'Salli',
  'Joey',
  'Justin',
  'Kevin',
  'Matthew',
  'Ruth',
  'Stephen',
  'Gregory',
  'Danielle',
  'Patrick',
]);

export const isAwsVoiceName = (voiceName: string): boolean =>
  KNOWN_AWS_VOICES.has(voiceName);

export const resolveAwsVoiceName = (
  requestedVoiceName: unknown,
  configuredVoiceName: unknown,
  defaultVoiceName: string
): string => {
  const requested =
    typeof requestedVoiceName === 'string' ? requestedVoiceName.trim() : '';
  if (requested && isAwsVoiceName(requested)) {
    return requested;
  }

  const configured =
    typeof configuredVoiceName === 'string' ? configuredVoiceName.trim() : '';
  if (configured && isAwsVoiceName(configured)) {
    return configured;
  }

  // 既定値（env 由来）も検証する。typo / 余白混入で未知 VoiceId が下流へ流れるのを防ぐ。
  const fallback = defaultVoiceName.trim();
  if (fallback && isAwsVoiceName(fallback)) {
    return fallback;
  }
  throw new Error(`Invalid default AWS Polly voice id: ${defaultVoiceName}`);
};
