import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import { base64ToUint8Array } from './base64ToUint8Array';

// ネットワーク切り替えやドーズ状態に入るとリクエストが応答もエラーも返さず
// 永久にハングすることがある。その場合に呼び出し側(useTTS)のplayingRefが
// 解放されずTTS全体が停止してしまうため、AbortControllerで上限時間を設ける。
export const TTS_FETCH_TIMEOUT_MS = 20_000;

export interface FetchSpeechOptions {
  textJa: string;
  textEn: string;
  apiUrl: string;
  idToken: string;
  jaVoiceName?: string;
  enVoiceName?: string;
  timeoutMs?: number;
}

const getSampleRateFromMimeType = (mimeType: string): number => {
  const rate = mimeType.match(/rate=(\d+)/i)?.[1];
  const parsed = rate ? Number.parseInt(rate, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 24000;
};

const wrapPcm16LeToWav = (
  pcmData: Uint8Array,
  sampleRate: number
): Uint8Array => {
  const channels = 1;
  const bitsPerSample = 16;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;
  const out = new Uint8Array(44 + dataSize);
  const view = new DataView(out.buffer);

  // RIFF header
  out.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  view.setUint32(4, fileSize, true);
  out.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE

  // fmt chunk
  out.set([0x66, 0x6d, 0x74, 0x20], 12); // fmt
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  out.set([0x64, 0x61, 0x74, 0x61], 36); // data
  view.setUint32(40, dataSize, true);
  out.set(pcmData, 44);

  return out;
};

const normalizeAudioForFile = (
  base64Audio: string,
  mimeType?: string
): { bytes: Uint8Array; ext: 'mp3' | 'wav' } => {
  const normalizedMime = mimeType?.toLowerCase() ?? '';
  const bytes = base64ToUint8Array(base64Audio);

  if (normalizedMime.includes('mpeg') || normalizedMime.includes('mp3')) {
    return { bytes, ext: 'mp3' };
  }

  if (normalizedMime.includes('wav')) {
    return { bytes, ext: 'wav' };
  }

  if (
    normalizedMime.includes('pcm') ||
    normalizedMime.includes('l16') ||
    normalizedMime.includes('linear16')
  ) {
    const sampleRate = getSampleRateFromMimeType(normalizedMime);
    return {
      bytes: wrapPcm16LeToWav(bytes, sampleRate),
      ext: 'wav',
    };
  }

  // MIME不明時はPCM/L16を想定してWAV化する
  return {
    bytes: wrapPcm16LeToWav(bytes, 24000),
    ext: 'wav',
  };
};

const fetchCache = new Map<
  string,
  { id: string; pathJa: string; pathEn: string }
>();

const normalizeOptional = (val: string | undefined): string => {
  const trimmed = (val ?? '').trim();
  return trimmed.length > 0 ? trimmed : '';
};

// ヘボン式ローマ字の長音符（マクロン: Ā ā Ē ē Ī ī Ō ō Ū ū）を素の母音へ落とす。
// NFD で母音と結合マクロン（U+0304）へ分解し、マクロンだけ取り除いて NFC に戻す。
// 既存の useIsDifferentStationName と同じ手法。
const COMBINING_MACRON = String.fromCharCode(0x0304);
const stripMacrons = (text: string): string =>
  text.normalize('NFD').replaceAll(COMBINING_MACRON, '').normalize('NFC');

// TTS API（Azure Speech）はマクロン付き母音を正しく読めず、英語駅名を誤読・無音化
// することがあるため、SSML の可視テキストからマクロンを除去する。
// タグ（<...>）は属性ごと保護し、タグ外のテキストだけを対象にすることで、
// <phoneme ph="..."> の IPA 発音記号など読みの正確さに関わる値は温存する。
const stripMacronsFromSsmlText = (ssml: string): string =>
  ssml.replace(/<[^>]*>|[^<]+/g, (token) =>
    token.startsWith('<') ? token : stripMacrons(token)
  );

const buildCacheKey = (opts: FetchSpeechOptions): string =>
  `${opts.textJa}\0${opts.textEn}\0${normalizeOptional(opts.jaVoiceName)}\0${normalizeOptional(opts.enVoiceName)}`;

export const clearFetchCache = (): void => {
  fetchCache.clear();
};

export const fetchSpeechAudio = async (
  options: FetchSpeechOptions
): Promise<{ id: string; pathJa: string; pathEn: string } | null> => {
  const {
    textJa,
    textEn,
    apiUrl,
    idToken,
    jaVoiceName,
    enVoiceName,
    timeoutMs = TTS_FETCH_TIMEOUT_MS,
  } = options;
  // 0・負値・NaN・Infinity が明示的に渡された場合もタイムアウト保護が
  // 効くよう、正の有限値に正規化する
  const effectiveTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : TTS_FETCH_TIMEOUT_MS;

  if (!textJa.length || !textEn.length) {
    return null;
  }

  // TTS API はマクロン付き英語駅名を誤読・無音化することがあるため、送信前に
  // 英語 SSML の可視テキストからマクロンを除去する（日本語側は元々マクロンを含まない）。
  const sanitizedTextEn = stripMacronsFromSsmlText(textEn);

  const cacheKey = buildCacheKey({ ...options, textEn: sanitizedTextEn });
  const cached = fetchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const normalizedJaVoiceName = normalizeOptional(jaVoiceName);
  const normalizedEnVoiceName = normalizeOptional(enVoiceName);

  const reqBody = {
    data: {
      ssmlJa: `<speak>${textJa.trim()}</speak>`,
      ssmlEn: `<speak>${sanitizedTextEn.trim()}</speak>`,
      ...(normalizedJaVoiceName ? { jaVoiceName: normalizedJaVoiceName } : {}),
      ...(normalizedEnVoiceName ? { enVoiceName: normalizedEnVoiceName } : {}),
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveTimeoutMs);

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(reqBody),
      method: 'POST',
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(
        `[ttsSpeechFetcher] TTS API returned ${response.status}: ${response.statusText}`
      );
      return null;
    }

    const ttsJson = await response.json();

    if (!ttsJson?.result?.id) {
      console.warn(
        '[ttsSpeechFetcher] Invalid TTS response: missing result.id'
      );
      return null;
    }

    const {
      jaAudioContent,
      enAudioContent,
      id,
      jaAudioMimeType,
      enAudioMimeType,
    } = ttsJson.result;

    if (!jaAudioContent || !enAudioContent) {
      console.warn(
        '[ttsSpeechFetcher] Missing audio content in TTS response, skipping file write'
      );
      return null;
    }

    const normalizedJa = normalizeAudioForFile(jaAudioContent, jaAudioMimeType);
    const normalizedEn = normalizeAudioForFile(enAudioContent, enAudioMimeType);

    const fileJa = new File(Paths.cache, `${id}_ja.${normalizedJa.ext}`);
    const fileEn = new File(Paths.cache, `${id}_en.${normalizedEn.ext}`);

    fileJa.write(normalizedJa.bytes);
    fileEn.write(normalizedEn.bytes);

    const result = { id, pathJa: fileJa.uri, pathEn: fileEn.uri };
    fetchCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ttsSpeechFetcher] fetchSpeech error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};
