/**
 * Azure Speech（Cognitive Services TTS）でテキストを音声に変換する。
 * Azure は SSML 必須。クライアントが送る `<speak>…</speak>` の中身を取り出し、
 * voice/lang/スタイル/プロソディを含む Azure 準拠 SSML に包み直して合成する。出力は MP3。
 */
import { isAzureHdVoiceName } from '../../utils/ttsVoice';
import { bytesToBase64 } from '../crypto';

// 音質。低ビットレートだと圧縮ノイズで機械っぽく聞こえるため既定を高めにする。
const DEFAULT_OUTPUT_FORMAT = 'audio-48khz-192kbitrate-mono-mp3';

export interface TtsOptions {
  /** X-Microsoft-OutputFormat。未指定なら高音質既定 */
  outputFormat?: string;
  /** mstts:express-as の style（例: narration-relaxed, customerservice）。未指定なら付けない */
  style?: string;
  /** style の強さ（0.01〜2。未指定なら付けない） */
  styleDegree?: string;
  /** prosody rate（例: -5%, 0.95, slow）。未指定なら付けない */
  rate?: string;
  /** prosody pitch（例: -2%, +1st）。未指定なら付けない */
  pitch?: string;
}

/** クライアント SSML から外側の <speak> を剥がして中身だけ返す。 */
const extractSpeakInner = (ssml: string): string => {
  const trimmed = ssml.trim();
  const match = trimmed.match(/^<speak[^>]*>([\s\S]*)<\/speak>$/i);
  return (match ? match[1] : trimmed).trim();
};

export const buildAzureSsml = (
  inner: string,
  languageCode: string,
  voiceName: string,
  opts: TtsOptions
): string => {
  let content = inner;

  // HD（DragonHD）ボイスは <prosody> と <mstts:express-as> を非対応のため、
  // これらの装飾を付けると合成エラー・無視の原因になる。HD では出力しない。
  const isHd = isAzureHdVoiceName(voiceName);

  if (!isHd && (opts.rate || opts.pitch)) {
    const attrs = [
      opts.rate ? `rate="${opts.rate}"` : '',
      opts.pitch ? `pitch="${opts.pitch}"` : '',
    ]
      .filter(Boolean)
      .join(' ');
    content = `<prosody ${attrs}>${content}</prosody>`;
  }

  if (!isHd && opts.style) {
    const degree = opts.styleDegree ? ` styledegree="${opts.styleDegree}"` : '';
    content = `<mstts:express-as style="${opts.style}"${degree}>${content}</mstts:express-as>`;
  }

  return (
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ' +
    'xmlns:mstts="https://www.w3.org/2001/mstts" ' +
    `xml:lang="${languageCode}"><voice name="${voiceName}">${content}</voice></speak>`
  );
};

export interface SynthesizedAudio {
  /** base64 エンコードされた MP3 */
  audioContent: string;
  mimeType: 'audio/mpeg';
}

export const synthesizeSpeech = async (
  region: string,
  subscriptionKey: string,
  ssml: string,
  languageCode: string,
  voiceName: string,
  opts: TtsOptions = {}
): Promise<SynthesizedAudio> => {
  const inner = extractSpeakInner(ssml);
  const body = buildAzureSsml(inner, languageCode, voiceName, opts);

  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': opts.outputFormat || DEFAULT_OUTPUT_FORMAT,
      'User-Agent': 'trainlcd-worker',
    },
    body,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Azure TTS returned ${res.status}: ${detail.slice(0, 500)}`
    );
  }

  const buf = await res.arrayBuffer();
  return { audioContent: bytesToBase64(buf), mimeType: 'audio/mpeg' };
};
