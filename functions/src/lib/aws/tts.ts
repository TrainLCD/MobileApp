/**
 * AWS Polly（SynthesizeSpeech）でテキストを音声に変換する。
 * Polly も SSML を受け付ける。クライアントが送る `<speak>…</speak>` の中身を取り出し、
 * voice/engine/プロソディを反映した Polly 準拠 SSML に包み直して合成する。出力は MP3。
 *
 * リクエストは SigV4 署名が必要なため aws4fetch で署名する。
 */
import { AwsClient } from 'aws4fetch';
import { bytesToBase64 } from '../crypto';

// Polly の合成エンジン。Azure の Neural 相当の品質を既定にする。
const DEFAULT_ENGINE = 'neural';
// 出力フォーマット。Azure と同じく MP3 を既定にし、クライアント互換を保つ。
const DEFAULT_OUTPUT_FORMAT = 'mp3';

export interface TtsOptions {
  /** Polly の合成エンジン（standard / neural / long-form / generative）。未指定なら neural */
  engine?: string;
  /** OutputFormat（mp3 / ogg_vorbis / pcm）。未指定なら mp3 */
  outputFormat?: string;
  /** prosody rate（例: 97%, slow, x-fast）。未指定なら付けない */
  rate?: string;
  /** prosody volume（例: loud, +2dB）。未指定なら付けない */
  volume?: string;
}

/** OutputFormat から MIME タイプを導出する。 */
const mimeTypeForFormat = (format: string): string => {
  switch (format.toLowerCase()) {
    case 'ogg_vorbis':
      return 'audio/ogg';
    case 'pcm':
      return 'audio/pcm';
    default:
      return 'audio/mpeg';
  }
};

/** クライアント SSML から外側の <speak> を剥がして中身だけ返す。 */
const extractSpeakInner = (ssml: string): string => {
  const trimmed = ssml.trim();
  const match = trimmed.match(/^<speak[^>]*>([\s\S]*)<\/speak>$/i);
  return (match ? match[1] : trimmed).trim();
};

const buildPollySsml = (inner: string, opts: TtsOptions): string => {
  let content = inner;

  // Polly neural はプロソディの rate / volume をサポートする（pitch は非対応のため扱わない）。
  if (opts.rate || opts.volume) {
    const attrs = [
      opts.rate ? `rate="${opts.rate}"` : '',
      opts.volume ? `volume="${opts.volume}"` : '',
    ]
      .filter(Boolean)
      .join(' ');
    content = `<prosody ${attrs}>${content}</prosody>`;
  }

  return `<speak>${content}</speak>`;
};

export interface SynthesizedAudio {
  /** base64 エンコードされた音声 */
  audioContent: string;
  mimeType: string;
}

export const synthesizeSpeech = async (
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  ssml: string,
  languageCode: string,
  voiceId: string,
  opts: TtsOptions = {}
): Promise<SynthesizedAudio> => {
  const inner = extractSpeakInner(ssml);
  const text = buildPollySsml(inner, opts);
  const outputFormat = opts.outputFormat || DEFAULT_OUTPUT_FORMAT;

  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region,
    service: 'polly',
  });

  const url = `https://polly.${region}.amazonaws.com/v1/speech`;
  const res = await client.fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Engine: opts.engine || DEFAULT_ENGINE,
      LanguageCode: languageCode,
      OutputFormat: outputFormat,
      Text: text,
      TextType: 'ssml',
      VoiceId: voiceId,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `AWS Polly returned ${res.status}: ${detail.slice(0, 500)}`
    );
  }

  const buf = await res.arrayBuffer();
  return {
    audioContent: bytesToBase64(buf),
    mimeType: mimeTypeForFormat(outputFormat),
  };
};
