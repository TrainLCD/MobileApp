import { getIdToken } from '@react-native-firebase/auth';
import { File, Paths } from 'expo-file-system';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { DEV_TTS_API_URL, PRODUCTION_TTS_API_URL } from 'react-native-dotenv';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Event,
  IOSCategory,
  IOSCategoryMode,
  IOSCategoryOptions,
  State,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import { isBusLine } from '~/utils/line';
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
  const pausedByBackgroundRef = useRef(false);
  const isLoadableRef = useRef(true);
  const isPlayerSetupRef = useRef(false);
  const setupPromiseRef = useRef<Promise<boolean> | null>(null);
  const { store, getByText } = useTTSCache();
  const trainTTSText = useTTSText(firstSpeechRef.current, enabled);
  const busTTSText = useBusTTSText(firstSpeechRef.current, enabled);
  const isBus = isBusLine(currentLine);
  const ttsText = isBus ? busTTSText : trainTTSText;
  const [prevTextJa, prevTextEn] = usePrevious(ttsText);
  const [textJa, textEn] = ttsText;

  const user = useCachedInitAnonymousUser();

  const ensureSetup = useCallback(async (): Promise<boolean> => {
    if (isPlayerSetupRef.current) {
      return true;
    }

    if (setupPromiseRef.current) {
      return setupPromiseRef.current;
    }

    setupPromiseRef.current = (async () => {
      try {
        await TrackPlayer.setupPlayer({
          autoHandleInterruptions: true,
          // ダッキング設定（他のアプリの音量を下げる）
          iosCategory: IOSCategory.Playback,
          iosCategoryMode: IOSCategoryMode.SpokenAudio,
          iosCategoryOptions: [IOSCategoryOptions.DuckOthers],
        });
      } catch (e) {
        // "already been initialized" は成功として扱う
        if (
          e instanceof Error &&
          e.message.includes('already been initialized')
        ) {
          console.log('[useTTS] TrackPlayer already initialized');
        } else {
          console.warn('[useTTS] setupPlayer failed:', e);
          setupPromiseRef.current = null;
          return false;
        }
      }

      isPlayerSetupRef.current = true;

      try {
        // 通知なしの設定
        await TrackPlayer.updateOptions({
          capabilities: [],
          compactCapabilities: [],
          notificationCapabilities: [],
          android: {
            appKilledPlaybackBehavior:
              AppKilledPlaybackBehavior.ContinuePlayback,
          },
        });
      } catch (e) {
        console.warn('[useTTS] updateOptions failed:', e);
      }

      return true;
    })();

    return setupPromiseRef.current;
  }, []);

  useEffect(() => {
    ensureSetup();
  }, [ensureSetup]);

  useTrackPlayerEvents([Event.PlaybackQueueEnded], () => {
    playingRef.current = false;
  });

  useTrackPlayerEvents([Event.RemotePause], () => {
    playingRef.current = false;
  });

  useTrackPlayerEvents([Event.PlaybackState], async (event) => {
    if (event.state === State.Playing) {
      playingRef.current = true;
    } else if (event.state === State.Error) {
      console.warn('[useTTS] PlaybackState error');
      playingRef.current = false;
      try {
        await TrackPlayer.reset();
      } catch {}
    }
  });

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        (nextAppState === 'background' || nextAppState === 'inactive') &&
        !backgroundEnabled
      ) {
        try {
          const state = await TrackPlayer.getPlaybackState();
          if (state.state === State.Playing) {
            await TrackPlayer.pause();
            pausedByBackgroundRef.current = true;
          }
        } catch {}
      } else if (nextAppState === 'active' && pausedByBackgroundRef.current) {
        try {
          await TrackPlayer.play();
          pausedByBackgroundRef.current = false;
        } catch {}
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [backgroundEnabled]);

  const speakFromPath = useCallback(
    async (pathJa: string, pathEn: string) => {
      if (!isLoadableRef.current) {
        return;
      }

      const isSetup = await ensureSetup();
      if (!isSetup) {
        return;
      }

      firstSpeechRef.current = false;
      playingRef.current = true;

      try {
        await TrackPlayer.reset();
        await TrackPlayer.add([
          {
            id: 'tts-ja',
            url: pathJa,
            title: 'TTS Japanese',
            artist: 'TrainLCD',
          },
          {
            id: 'tts-en',
            url: pathEn,
            title: 'TTS English',
            artist: 'TrainLCD',
          },
        ]);
        await TrackPlayer.play();
      } catch (e) {
        console.error('[useTTS] Failed to play:', e);
        playingRef.current = false;
        try {
          await TrackPlayer.reset();
        } catch {}
      }
    },
    [ensureSetup]
  );

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
      if (!user) {
        console.error('[useTTS] User is not available');
        return null;
      }

      const idToken = await getIdToken(user);

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
      (async () => {
        try {
          await TrackPlayer.reset();
        } catch {}
        playingRef.current = false;
      })();
    };
  }, []);
};
