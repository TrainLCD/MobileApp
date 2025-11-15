import type { AudioPlayer } from 'expo-audio';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DEV_TTS_API_URL, PRODUCTION_TTS_API_URL } from 'react-native-dotenv';
import speechState from '../store/atoms/speech';
import { isDevApp } from '../utils/isDevApp';
import { useCachedInitAnonymousUser } from './useCachedAnonymousUser';
import { usePrevious } from './usePrevious';
import { useTTSCache } from './useTTSCache';
import { useTTSText } from './useTTSText';

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const base64ToUint8Array = (input: string): Uint8Array => {
  const sanitized = input.replace(/[^A-Za-z0-9+/=]/g, '');
  const length =
    (sanitized.length * 3) / 4 -
    (sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0);
  const bytes = new Uint8Array(length);

  let byteIndex = 0;
  const decodeChar = (char: string): number => {
    if (char === '=') {
      return 0;
    }
    const index = BASE64_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base64 character.');
    }
    return index;
  };

  for (let i = 0; i < sanitized.length; i += 4) {
    const chunk =
      (decodeChar(sanitized[i]) << 18) |
      (decodeChar(sanitized[i + 1]) << 12) |
      (decodeChar(sanitized[i + 2]) << 6) |
      decodeChar(sanitized[i + 3]);

    bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (sanitized[i + 2] !== '=') {
      bytes[byteIndex++] = (chunk >> 8) & 0xff;
    }
    if (sanitized[i + 3] !== '=') {
      bytes[byteIndex++] = chunk & 0xff;
    }
  }

  return bytes;
};

export const useTTS = (): void => {
  const { enabled, backgroundEnabled } = useAtomValue(speechState);

  const firstSpeechRef = useRef(true);
  const playingRef = useRef(false);
  const isLoadableRef = useRef(true);
  const { store, getByText } = useTTSCache();
  const ttsText = useTTSText(firstSpeechRef.current, enabled);
  const [prevTextJa, prevTextEn] = usePrevious(ttsText);
  const [textJa, textEn] = ttsText;

  const user = useCachedInitAnonymousUser();

  const soundJaRef = useRef<AudioPlayer | null>(null);
  const soundEnRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          shouldPlayInBackground: backgroundEnabled,
          interruptionMode: 'duckOthers',
          playsInSilentMode: true,
          interruptionModeAndroid: 'duckOthers',
          shouldRouteThroughEarpiece: false,
        });
      } catch (e) {
        console.warn('[useTTS] setAudioModeAsync failed:', e);
      }
    })();
  }, [backgroundEnabled]);

  const speakFromPath = useCallback(async (pathJa: string, pathEn: string) => {
    if (!isLoadableRef.current) {
      return;
    }

    firstSpeechRef.current = false;

    // 既存のプレイヤーをクリーンアップ
    try {
      soundJaRef.current?.pause();
      soundJaRef.current?.remove();
    } catch {}
    try {
      soundEnRef.current?.pause();
      soundEnRef.current?.remove();
    } catch {}
    soundJaRef.current = null;
    soundEnRef.current = null;

    const soundJa = createAudioPlayer({
      uri: pathJa,
    });
    const soundEn = createAudioPlayer({
      uri: pathEn,
    });

    soundJaRef.current = soundJa;
    soundEnRef.current = soundEn;
    playingRef.current = true;

    const enRemoveListener = soundEn.addListener(
      'playbackStatusUpdate',
      (enStatus) => {
        if (enStatus.didJustFinish) {
          enRemoveListener?.remove();
          try {
            soundEn.remove();
          } catch (e) {
            console.warn('[useTTS] Failed to remove soundEn:', e);
          }
          soundEnRef.current = null;
          playingRef.current = false;
        } else if ('error' in enStatus && enStatus.error) {
          // 英語側エラー時も確実に終了
          console.warn('[useTTS] soundEn error:', enStatus.error);
          enRemoveListener?.remove();
          try {
            soundEn.remove();
          } catch {}
          soundEnRef.current = null;
          playingRef.current = false;
        }
      }
    );

    const jaRemoveListener = soundJa.addListener(
      'playbackStatusUpdate',
      (jaStatus) => {
        if (jaStatus.didJustFinish) {
          jaRemoveListener?.remove();
          try {
            soundJa.remove();
          } catch (e) {
            console.warn('[useTTS] Failed to remove soundJa:', e);
          }
          soundJaRef.current = null;
          if (isLoadableRef.current) {
            soundEn.play();
          } else {
            // 既にアンマウント等で再生不可なら英語を鳴らさず完全停止
            enRemoveListener?.remove();
            try {
              soundEn.remove();
            } catch {}
            soundEnRef.current = null;
            playingRef.current = false;
          }
        } else if ('error' in jaStatus && jaStatus.error) {
          // 日本語側エラー時は両者解放して停止
          console.warn('[useTTS] soundJa error:', jaStatus.error);
          jaRemoveListener?.remove();
          try {
            soundJa.remove();
          } catch {}
          soundJaRef.current = null;
          enRemoveListener?.remove();
          try {
            soundEn.remove();
          } catch {}
          soundEnRef.current = null;
          playingRef.current = false;
        }
      }
    );

    try {
      soundJa.play();
    } catch (e) {
      console.error('[useTTS] Failed to play soundJa:', e);
      // 再生失敗時もリスナーとリソースをクリーンアップ
      jaRemoveListener?.remove();
      enRemoveListener?.remove();
      try {
        soundJa.remove();
      } catch {}
      try {
        soundEn.remove();
      } catch {}
      soundJaRef.current = null;
      soundEnRef.current = null;
      playingRef.current = false;
    }
  }, []);

  const ttsApiUrl = useMemo(() => {
    return isDevApp ? DEV_TTS_API_URL : PRODUCTION_TTS_API_URL;
  }, []);

  const fetchSpeech = useCallback(async () => {
    if (!textJa?.length || !textEn?.length || !isLoadableRef.current) {
      return;
    }

    const reqBody = {
      data: {
        ssmlJa: `<speak>${textJa.trim()}</speak>`,
        ssmlEn: `<speak>${textEn.trim()}</speak>`,
      },
    };

    try {
      const idToken = await user?.getIdToken();

      const response = await fetch(ttsApiUrl, {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(reqBody),
        method: 'POST',
      });

      if (!response.ok) {
        console.error(
          '[useTTS] TTS API request failed:',
          response.status,
          response.statusText
        );
        return null;
      }

      const ttsJson = await response.json();

      if (!ttsJson?.result?.id) {
        console.error('[useTTS] TTS API response missing id');
        return null;
      }

      const cacheDirectory = Paths.cache;
      const pathJaFile = new File(
        cacheDirectory,
        `${ttsJson.result.id}_ja.mp3`
      );
      const pathEnFile = new File(
        cacheDirectory,
        `${ttsJson.result.id}_en.mp3`
      );

      if (ttsJson?.result?.jaAudioContent) {
        pathJaFile.write(base64ToUint8Array(ttsJson.result.jaAudioContent));
      }
      if (ttsJson?.result?.enAudioContent) {
        pathEnFile.write(base64ToUint8Array(ttsJson.result.enAudioContent));
      }

      if (
        !ttsJson?.result?.jaAudioContent ||
        !ttsJson?.result?.enAudioContent
      ) {
        console.error('[useTTS] TTS API response missing audio content');
        return null;
      }
      return {
        id: ttsJson.result.id,
        pathJa: pathJaFile.uri,
        pathEn: pathEnFile.uri,
      };
    } catch (error) {
      console.error('[useTTS] fetchSpeech error:', error);
      return null;
    }
  }, [textEn, textJa, ttsApiUrl, user]);

  const speech = useCallback(async () => {
    if (!textJa || !textEn) {
      return;
    }

    try {
      const cache = getByText(textJa);

      if (cache) {
        await speakFromPath(cache.ja.path, cache.en.path);
        return;
      }

      const fetched = await fetchSpeech();
      if (!fetched) {
        console.warn('[useTTS] Failed to fetch speech audio');
        return;
      }

      const { id, pathJa, pathEn } = fetched;

      store(id, { text: textJa, path: pathJa }, { text: textEn, path: pathEn });

      await speakFromPath(pathJa, pathEn);
    } catch (error) {
      console.error('[useTTS] speech error:', error);
    }
  }, [fetchSpeech, getByText, speakFromPath, store, textEn, textJa]);

  useEffect(() => {
    if (
      !enabled ||
      playingRef.current ||
      (prevTextJa === textJa && prevTextEn === textEn)
    ) {
      return;
    }

    (async () => {
      try {
        await speech();
      } catch (err) {
        console.error(err);
      }
    })();
  }, [enabled, prevTextEn, prevTextJa, speech, textEn, textJa]);

  useEffect(() => {
    return () => {
      isLoadableRef.current = false;
      try {
        soundJaRef.current?.pause();
      } catch {}
      try {
        soundEnRef.current?.pause();
      } catch {}
      try {
        soundJaRef.current?.remove();
      } catch {}
      try {
        soundEnRef.current?.remove();
      } catch {}
      soundJaRef.current = null;
      soundEnRef.current = null;
      playingRef.current = false;
    };
  }, []);
};
