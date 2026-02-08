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

// 再生が完了しない場合のフォールバックタイムアウト（ミリ秒）
const PLAYBACK_TIMEOUT_MS = 60_000;

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
  const playingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jaListenerRef = useRef<{ remove: () => void } | null>(null);
  const enListenerRef = useRef<{ remove: () => void } | null>(null);

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

  // playingRefのリセットとpending処理を一元化してデッドロックを防止
  const finishPlaying = useCallback(() => {
    playingRef.current = false;
    if (playingTimeoutRef.current) {
      clearTimeout(playingTimeoutRef.current);
      playingTimeoutRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      speechWithTextRef.current?.(pending.textJa, pending.textEn);
    }
  }, []);

  const speakFromPath = useCallback(
    async (pathJa: string, pathEn: string) => {
      if (!isLoadableRef.current) {
        return;
      }

      firstSpeechRef.current = false;

      // 既存のリスナーとプレイヤーをクリーンアップ
      try {
        jaListenerRef.current?.remove();
      } catch {}
      jaListenerRef.current = null;
      try {
        enListenerRef.current?.remove();
      } catch {}
      enListenerRef.current = null;
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

      // 既存のタイムアウトをクリア
      if (playingTimeoutRef.current) {
        clearTimeout(playingTimeoutRef.current);
      }

      const soundJa = createAudioPlayer({
        uri: pathJa,
      });

      soundJaRef.current = soundJa;
      playingRef.current = true;

      // 再生が完了しない場合のフォールバックタイムアウト
      playingTimeoutRef.current = setTimeout(() => {
        if (!playingRef.current) {
          return;
        }
        console.warn(
          '[useTTS] Playback safety timeout reached, force resetting'
        );
        try {
          jaListenerRef.current?.remove();
        } catch {}
        jaListenerRef.current = null;
        try {
          enListenerRef.current?.remove();
        } catch {}
        enListenerRef.current = null;
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
        finishPlaying();
      }, PLAYBACK_TIMEOUT_MS);

      const jaRemoveListener = soundJa.addListener(
        'playbackStatusUpdate',
        (jaStatus) => {
          if (jaStatus.didJustFinish) {
            jaRemoveListener?.remove();
            jaListenerRef.current = null;
            try {
              soundJa.remove();
            } catch (e) {
              console.warn('[useTTS] Failed to remove soundJa:', e);
            }
            soundJaRef.current = null;
            if (isLoadableRef.current) {
              // 日本語再生完了後に英語プレイヤーを生成して再生（リソース節約）
              const soundEn = createAudioPlayer({
                uri: pathEn,
              });
              soundEnRef.current = soundEn;

              const enRemoveListener = soundEn.addListener(
                'playbackStatusUpdate',
                (enStatus) => {
                  if (enStatus.didJustFinish) {
                    enRemoveListener?.remove();
                    enListenerRef.current = null;
                    try {
                      soundEn.remove();
                    } catch (e) {
                      console.warn('[useTTS] Failed to remove soundEn:', e);
                    }
                    soundEnRef.current = null;
                    finishPlaying();
                  } else if ('error' in enStatus && enStatus.error) {
                    console.warn('[useTTS] soundEn error:', enStatus.error);
                    enRemoveListener?.remove();
                    enListenerRef.current = null;
                    try {
                      soundEn.remove();
                    } catch {}
                    soundEnRef.current = null;
                    finishPlaying();
                  }
                }
              );
              enListenerRef.current = enRemoveListener;

              try {
                soundEn.play();
              } catch (e) {
                console.error('[useTTS] Failed to play soundEn:', e);
                enRemoveListener?.remove();
                enListenerRef.current = null;
                try {
                  soundEn.remove();
                } catch {}
                soundEnRef.current = null;
                finishPlaying();
              }
            } else {
              // 既にアンマウント等で再生不可なら英語を鳴らさず完全停止
              finishPlaying();
            }
          } else if ('error' in jaStatus && jaStatus.error) {
            console.warn('[useTTS] soundJa error:', jaStatus.error);
            jaRemoveListener?.remove();
            jaListenerRef.current = null;
            try {
              soundJa.remove();
            } catch {}
            soundJaRef.current = null;
            finishPlaying();
          }
        }
      );
      jaListenerRef.current = jaRemoveListener;

      try {
        soundJa.play();
      } catch (e) {
        console.error('[useTTS] Failed to play soundJa:', e);
        jaRemoveListener?.remove();
        jaListenerRef.current = null;
        try {
          soundJa.remove();
        } catch {}
        soundJaRef.current = null;
        finishPlaying();
      }
    },
    [finishPlaying]
  );

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
      playingRef.current = true;
      try {
        const fetched = await fetchSpeechWithText(ja, en);
        if (!fetched) {
          console.warn('[useTTS] Failed to fetch speech audio');
          finishPlaying();
          return;
        }

        const { pathJa, pathEn } = fetched;

        await speakFromPath(pathJa, pathEn);
      } catch (error) {
        console.error('[useTTS] speech error:', error);
        finishPlaying();
      }
    },
    [fetchSpeechWithText, finishPlaying, speakFromPath]
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
      console.warn('[useTTS] Already playing, queuing text as pending');
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
      if (playingTimeoutRef.current) {
        clearTimeout(playingTimeoutRef.current);
        playingTimeoutRef.current = null;
      }
      try {
        jaListenerRef.current?.remove();
      } catch {}
      jaListenerRef.current = null;
      try {
        enListenerRef.current?.remove();
      } catch {}
      enListenerRef.current = null;
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
