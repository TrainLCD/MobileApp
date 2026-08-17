import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import { base64ToUint8Array } from './base64ToUint8Array';

// ネットワーク切り替えやドーズ状態に入るとリクエストが応答もエラーも返さず
// 永久にハングすることがある。その場合に呼び出し側の再生パイプラインが
// 解放されず TTS 全体が停止してしまうため、AbortController で上限時間を設ける。
export const TTS_FETCH_TIMEOUT_MS = 20_000;

// キャッシュファイル名に使える id の文字種（Worker は sha256 の16進文字列を返す）
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

// 合成済み音声のパスを保持する上限。1 回の乗車で数十件のアナウンスが生成される
// ため、無制限に持つとキャッシュディレクトリと Map が膨らみ続ける。
export const MAX_FETCH_CACHE_SIZE = 50;

export interface FetchSpeechOptions {
  // 読み上げるプレーンテキスト。Cloud TTS へは input.text として渡るため SSML は
  // 解釈されず、タグはそのまま読み上げられてしまう。呼び出し側で変換済みのものを
  // 渡すこと。合成は文字数課金のため、ユーザーが無効にしている言語は空/未指定に
  // して送信対象から外す（両方空なら何も要求しない）。
  textJa?: string;
  textEn?: string;
  apiUrl: string;
  idToken: string;
  // Cloud TTS のボイス名（例: ja-JP-Standard-B）。ロケールを含むため日英で別々に
  // 指定する。読み上げ速度・声の高さは Worker 側の設定で決まる。
  jaVoiceName?: string;
  enVoiceName?: string;
  timeoutMs?: number;
}

export interface FetchedSpeech {
  id: string;
  // 要求しなかった言語は null。要求した言語は必ず非 null（欠けた応答は失敗扱い）。
  pathJa: string | null;
  pathEn: string | null;
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

// MIME が欠落・不明なときに先頭バイトから形式を判定する。Cloud TTS の応答は
// MP3（既定）か RIFF ヘッダー付きの WAV(LINEAR16) で生 PCM は返らないため、
// 判定できないバイト列を無条件に PCM 扱いすると MP3 を WAV ヘッダーで包んで
// 再生不能にしてしまう。
const sniffAudioFormat = (bytes: Uint8Array): 'mp3' | 'wav' | 'unknown' => {
  // "RIFF" .... "WAVE"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  ) {
    return 'wav';
  }
  // "ID3" タグ付き MP3
  if (
    bytes.length >= 3 &&
    bytes[0] === 0x49 &&
    bytes[1] === 0x44 &&
    bytes[2] === 0x33
  ) {
    return 'mp3';
  }
  // MPEG フレーム同期 (11 bit すべて 1)
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return 'mp3';
  }
  return 'unknown';
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

  // MIME 不明時は中身から判定する。どちらとも判定できなければ生 PCM とみなして
  // WAV 化する（生 PCM を返し得た旧合成エンジン向けに残している保険）。
  const sniffed = sniffAudioFormat(bytes);
  if (sniffed !== 'unknown') {
    return { bytes, ext: sniffed };
  }
  return {
    bytes: wrapPcm16LeToWav(bytes, 24000),
    ext: 'wav',
  };
};

const fetchCache = new Map<string, FetchedSpeech>();

// 参照されなくなった音声ファイルを削除する。Map から捨てるだけだと
// キャッシュディレクトリに実ファイルが残り続けるため、退避と同時に消す。
// 削除できなくても（既に OS に掃除された等）キャッシュ整理は続ける。
const deleteCachedAudio = (speech: FetchedSpeech): void => {
  for (const path of [speech.pathJa, speech.pathEn]) {
    if (!path) {
      continue;
    }
    try {
      new File(path).delete();
    } catch (e) {
      console.warn('[ttsSpeechFetcher] failed to delete cached audio:', e);
    }
  }
};

// 同一テキストの再放送でリクエストを重ねないためのキャッシュ。Map は挿入順を
// 保つため、上限超過時に最古のエントリから捨てる。
const storeInFetchCache = (key: string, value: FetchedSpeech): void => {
  fetchCache.set(key, value);
  while (fetchCache.size > MAX_FETCH_CACHE_SIZE) {
    const oldest = fetchCache.entries().next().value;
    if (oldest === undefined) {
      break;
    }
    const [oldestKey, oldestValue] = oldest;
    fetchCache.delete(oldestKey);
    deleteCachedAudio(oldestValue);
  }
};

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

const buildCacheKey = (opts: {
  textJa: string;
  textEn: string;
  jaVoiceName?: string;
  enVoiceName?: string;
}): string =>
  [
    // 空文字は「その言語を要求しない」を意味するため、両方をキーに含めることで
    // 日本語のみ・英語のみ・両方のリクエストが別エントリとして区別される
    opts.textJa,
    opts.textEn,
    normalizeOptional(opts.jaVoiceName),
    normalizeOptional(opts.enVoiceName),
  ].join('\0');

export const clearFetchCache = (): void => {
  for (const speech of fetchCache.values()) {
    deleteCachedAudio(speech);
  }
  fetchCache.clear();
};

export const fetchSpeechAudio = async (
  options: FetchSpeechOptions
): Promise<FetchedSpeech | null> => {
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

  const trimmedTextJa = (textJa ?? '').trim();
  // 英語駅名のマクロンは ASCII 母音に落としても読みは変わらない一方、モデルに
  // よって扱いが揺れるため、送信前に正規化しておく（日本語側は元々含まない）。
  const sanitizedTextEn = stripMacrons((textEn ?? '').trim());

  const wantsJa = trimmedTextJa.length > 0;
  const wantsEn = sanitizedTextEn.length > 0;
  if (!wantsJa && !wantsEn) {
    return null;
  }

  const normalizedJaVoiceName = normalizeOptional(jaVoiceName);
  const normalizedEnVoiceName = normalizeOptional(enVoiceName);

  const cacheKey = buildCacheKey({
    textJa: trimmedTextJa,
    textEn: sanitizedTextEn,
    jaVoiceName: normalizedJaVoiceName,
    enVoiceName: normalizedEnVoiceName,
  });
  const cached = fetchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 要求しない言語のフィールドは送らない。Worker 側は届いた言語だけを合成する。
  const reqBody = {
    data: {
      ...(wantsJa
        ? {
            textJa: trimmedTextJa,
            ...(normalizedJaVoiceName
              ? { jaVoiceName: normalizedJaVoiceName }
              : {}),
          }
        : {}),
      ...(wantsEn
        ? {
            textEn: sanitizedTextEn,
            ...(normalizedEnVoiceName
              ? { enVoiceName: normalizedEnVoiceName }
              : {}),
          }
        : {}),
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

    // id はキャッシュファイル名に連結するため、パス区切りや `..` が混ざると
    // キャッシュディレクトリの外へ書き込みうる。応答元は認証済みの自前 Worker
    // だが、防御としてファイル名に使える文字だけを受理する。
    if (!ttsJson?.result?.id || !SAFE_ID_PATTERN.test(ttsJson.result.id)) {
      console.warn(
        '[ttsSpeechFetcher] Invalid TTS response: missing or malformed result.id'
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

    // 要求した言語の音声が欠けている応答は不完全なため失敗として扱い、
    // 呼び出し側のフォールバック（端末内蔵 TTS）へ委ねる。
    if ((wantsJa && !jaAudioContent) || (wantsEn && !enAudioContent)) {
      console.warn(
        '[ttsSpeechFetcher] Missing audio content in TTS response, skipping file write'
      );
      return null;
    }

    const writeAudio = (
      base64Audio: string,
      mimeType: string | undefined,
      suffix: 'ja' | 'en'
    ): string => {
      const normalized = normalizeAudioForFile(base64Audio, mimeType);
      const file = new File(Paths.cache, `${id}_${suffix}.${normalized.ext}`);
      file.write(normalized.bytes);
      return file.uri;
    };

    const result: FetchedSpeech = {
      id,
      pathJa: wantsJa
        ? writeAudio(jaAudioContent, jaAudioMimeType, 'ja')
        : null,
      pathEn: wantsEn
        ? writeAudio(enAudioContent, enAudioMimeType, 'en')
        : null,
    };
    storeInFetchCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ttsSpeechFetcher] fetchSpeech error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};
