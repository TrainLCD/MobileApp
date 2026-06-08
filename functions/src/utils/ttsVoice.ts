const STANDARD_VOICE_MARKER = '-Standard-';

export const isStandardVoiceName = (voiceName: string): boolean =>
  voiceName.includes(STANDARD_VOICE_MARKER);

export const resolveStandardVoiceName = (
  requestedVoiceName: unknown,
  configuredVoiceName: unknown,
  defaultVoiceName: string
): string => {
  const requested =
    typeof requestedVoiceName === 'string' ? requestedVoiceName.trim() : '';
  if (requested && isStandardVoiceName(requested)) {
    return requested;
  }

  const configured =
    typeof configuredVoiceName === 'string' ? configuredVoiceName.trim() : '';
  if (configured && isStandardVoiceName(configured)) {
    return configured;
  }

  return defaultVoiceName;
};
