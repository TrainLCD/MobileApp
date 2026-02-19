import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import { base64ToUint8Array } from './base64ToUint8Array';

export interface FetchSpeechOptions {
  textJa: string;
  textEn: string;
  apiUrl: string;
  idToken: string;
}

export const fetchSpeechAudio = async (
  options: FetchSpeechOptions
): Promise<{ id: string; pathJa: string; pathEn: string } | null> => {
  const { textJa, textEn, apiUrl, idToken } = options;

  if (!textJa.length || !textEn.length) {
    return null;
  }

  const reqBody = {
    data: {
      ssmlJa: `<speak>${textJa.trim()}</speak>`,
      ssmlEn: `<speak>${textEn.trim()}</speak>`,
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

    const { jaAudioContent, enAudioContent, id } = ttsJson.result;

    if (!jaAudioContent || !enAudioContent) {
      console.warn(
        '[ttsSpeechFetcher] Missing audio content in TTS response, skipping file write'
      );
      return null;
    }

    const fileJa = new File(Paths.cache, `${id}_ja.mp3`);
    const fileEn = new File(Paths.cache, `${id}_en.mp3`);

    fileJa.write(base64ToUint8Array(jaAudioContent));
    fileEn.write(base64ToUint8Array(enAudioContent));

    return {
      id,
      pathJa: fileJa.uri,
      pathEn: fileEn.uri,
    };
  } catch (error) {
    console.error('[ttsSpeechFetcher] fetchSpeech error:', error);
    return null;
  }
};
