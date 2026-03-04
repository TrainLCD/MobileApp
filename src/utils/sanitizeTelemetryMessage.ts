const MAX_TELEMETRY_MESSAGE_LENGTH = 2000;

const TELEMETRY_REDACTIONS: Array<[RegExp, string]> = [
  [/\b(Authorization["']?\s*[:=]\s*["']?Bearer\s+)[^\s"']+/gi, '$1[REDACTED]'],
  [/\b(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/g, '$1[REDACTED]'],
  [
    /(\b(?:idToken|accessToken|refreshToken|token|apiKey|secret|password|authorization)\b["']?\s*[:=]\s*["']?)([^"',\s}]+)/gi,
    '$1[REDACTED]',
  ],
  [
    /([?&](?:token|access_token|refresh_token|api_key|code|signature)=)[^&\s]+/gi,
    '$1[REDACTED]',
  ],
];

const stringify = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const sanitizeTelemetryMessage = (value: unknown): string => {
  const raw = stringify(value);
  const redacted = TELEMETRY_REDACTIONS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    raw
  );

  if (redacted.length <= MAX_TELEMETRY_MESSAGE_LENGTH) {
    return redacted;
  }

  return `${redacted.slice(0, MAX_TELEMETRY_MESSAGE_LENGTH)}...<truncated>`;
};
