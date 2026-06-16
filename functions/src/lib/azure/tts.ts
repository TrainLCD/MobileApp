/**
 * Azure Speech（Cognitive Services TTS）でテキストを音声合成する。
 * Azure は SSML 必須。クライアントが送る `<speak>…</speak>` の中身を取り出し、
 * voice/lang を含む Azure 準拠 SSML に包み直して合成する。出力は常に MP3。
 */
import { bytesToBase64 } from '../crypto';

const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

/** クライアント SSML から外側の <speak> を剥がして中身だけ返す。 */
const extractSpeakInner = (ssml: string): string => {
  const trimmed = ssml.trim();
  const match = trimmed.match(/^<speak[^>]*>([\s\S]*)<\/speak>$/i);
  return (match ? match[1] : trimmed).trim();
};

const buildAzureSsml = (
  inner: string,
  languageCode: string,
  voiceName: string
): string =>
  `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${languageCode}"><voice name="${voiceName}">${inner}</voice></speak>`;

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
  voiceName: string
): Promise<SynthesizedAudio> => {
  const inner = extractSpeakInner(ssml);
  const body = buildAzureSsml(inner, languageCode, voiceName);

  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
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
