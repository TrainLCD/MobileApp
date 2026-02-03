import { fetch } from 'expo/fetch';
import type { AudioPlayer } from 'expo-audio';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DEV_TTS_API_URL, PRODUCTION_TTS_API_URL } from 'react-native-dotenv';
import { TransportType } from '~/@types/graphql';
import speechState from '../store/atoms/speech';
import { isDevApp } from '../utils/isDevApp';
import { useBusTTSText } from './useBusTTSText';
import { useCachedInitAnonymousUser } from './useCachedAnonymousUser';
import { useCurrentLine } from './useCurrentLine';
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
  const currentLine = useCurrentLine();

  const firstSpeechRef = useRef(true);
  const playingRef = useRef(false);
  const isLoadableRef = useRef(true);
  const pendingRef = useRef<{ textJa: string; textEn: string } | null>(null);
  const speechWithTextRef = useRef<
    ((ja: string, en: string) => Promise<void>) | null
  >(null);
  const { store, getByText } = useTTSCache();
  const trainTTSText = useTTSText(firstSpeechRef.current, enabled);
  const busTTSText = useBusTTSText(firstSpeechRef.current, enabled);
  const ttsText =
    currentLine?.transportType === TransportType.Bus
      ? busTTSText
      : trainTTSText;
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
          // 再生中にテキストが変わっていたら次の再生をトリガー
          const pending = pendingRef.current;
          if (pending) {
            pendingRef.current = null;
            speechWithTextRef.current?.(pending.textJa, pending.textEn);
          }
        } else if ('error' in enStatus && enStatus.error) {
          // 英語側エラー時も確実に終了
          console.warn('[useTTS] soundEn error:', enStatus.error);
          enRemoveListener?.remove();
          try {
            soundEn.remove();
          } catch {}
          soundEnRef.current = null;
          playingRef.current = false;
          const pending = pendingRef.current;
          if (pending) {
            pendingRef.current = null;
            speechWithTextRef.current?.(pending.textJa, pending.textEn);
          }
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
          const pending = pendingRef.current;
          if (pending) {
            pendingRef.current = null;
            speechWithTextRef.current?.(pending.textJa, pending.textEn);
          }
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
      const pending = pendingRef.current;
      if (pending) {
        pendingRef.current = null;
        speechWithTextRef.current?.(pending.textJa, pending.textEn);
      }
    }
  }, []);

  const ttsApiUrl = useMemo(() => {
    return isDevApp ? DEV_TTS_API_URL : PRODUCTION_TTS_API_URL;
  }, []);

  const fetchSpeechWithText = useCallback(
    async (ja: string, en: string) => {
      if (!ja.length || !en.length || !isLoadableRef.current) {
        return;
      }

      const reqBody = {
        data: {
          ssmlJa: `<speak>${ja.trim()}</speak>`,
          ssmlEn: `<speak>${en.trim()}</speak>`,
        },
      };

      try {
        const idToken = await user?.getIdToken();
        if (!idToken) {
          console.warn('[useTTS] idToken is missing, skipping fetch');
          return;
        }

        const response = await fetch(ttsApiUrl, {
          headers: {
            'content-type': 'application/json; charset=UTF-8',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(reqBody),
          method: 'POST',
        });

        if (!response.ok) {
          console.warn(
            `[useTTS] TTS API returned ${response.status}: ${response.statusText}`
          );
          return;
        }

        const ttsJson = await response.json();

        if (!ttsJson?.result?.id) {
          console.warn('[useTTS] Invalid TTS response: missing result.id');
          return;
        }

        const { jaAudioContent, enAudioContent, id } = ttsJson.result;

        if (!jaAudioContent || !enAudioContent) {
          console.warn(
            '[useTTS] Missing audio content in TTS response, skipping file write'
          );
          return;
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
        console.error('[useTTS] fetchSpeech error:', error);
        return;
      }
    },
    [ttsApiUrl, user]
  );

  const speechWithText = useCallback(
    async (ja: string, en: string) => {
      try {
        const cache = getByText(ja);

        if (cache) {
          await speakFromPath(cache.ja.path, cache.en.path);
          return;
        }

        const fetched = await fetchSpeechWithText(ja, en);
        if (!fetched) {
          console.warn('[useTTS] Failed to fetch speech audio');
          return;
        }

        const { id, pathJa, pathEn } = fetched;

        store(id, { text: ja, path: pathJa }, { text: en, path: pathEn });

        await speakFromPath(pathJa, pathEn);
      } catch (error) {
        console.error('[useTTS] speech error:', error);
      }
    },
    [fetchSpeechWithText, getByText, speakFromPath, store]
  );

  speechWithTextRef.current = speechWithText;

  useEffect(() => {
    if (!enabled || (prevTextJa === textJa && prevTextEn === textEn)) {
      return;
    }

    if (!textJa || !textEn) {
      return;
    }

    // 再生中なら最新のテキストをpendingに記録して完了時にトリガー
    if (playingRef.current) {
      pendingRef.current = { textJa, textEn };
      return;
    }

    pendingRef.current = null;

    (async () => {
      try {
        await speechWithText(textJa, textEn);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [enabled, prevTextEn, prevTextJa, speechWithText, textEn, textJa]);

  useEffect(() => {
    return () => {
      isLoadableRef.current = false;
      pendingRef.current = null;
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
