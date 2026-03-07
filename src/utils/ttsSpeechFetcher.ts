import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import { base64ToUint8Array } from './base64ToUint8Array';

export interface FetchSpeechOptions {
  textJa: string;
  textEn: string;
  apiUrl: string;
  idToken: string;
  jaVoiceName?: string;
  enVoiceName?: string;
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

const buildCacheKey = (opts: FetchSpeechOptions): string =>
  `${opts.textJa}\0${opts.textEn}\0${opts.enVoiceName ?? ''}`;

export const clearFetchCache = (): void => {
  fetchCache.clear();
};

export const fetchSpeechAudio = async (
  options: FetchSpeechOptions
): Promise<{ id: string; pathJa: string; pathEn: string } | null> => {
  const { textJa, textEn, apiUrl, idToken, jaVoiceName, enVoiceName } = options;

  if (!textJa.length || !textEn.length) {
    return null;
  }

  const cacheKey = buildCacheKey(options);
  const cached = fetchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const reqBody = {
    data: {
      ssmlJa: `<speak>${textJa.trim()}</speak>`,
      ssmlEn: `<speak>${textEn.trim()}</speak>`,
      ...(jaVoiceName ? { jaVoiceName } : {}),
      ...(enVoiceName ? { enVoiceName } : {}),
    },
  };

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(reqBody),
      method: 'POST',
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
  }
};
