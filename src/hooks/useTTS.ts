import { getIdToken } from '@react-native-firebase/auth';
import {
  Audio,
  type AVPlaybackStatus,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';
import type { Sound } from 'expo-av/build/Audio';
import { File, Paths } from 'expo-file-system';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DEV_TTS_API_URL, PRODUCTION_TTS_API_URL } from 'react-native-dotenv';
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
  const isLoadableRef = useRef(true);
  const { store, getByText } = useTTSCache();
  const trainTTSText = useTTSText(firstSpeechRef.current, enabled);
  const busTTSText = useBusTTSText(firstSpeechRef.current, enabled);
  const isBus = isBusLine(currentLine);
  const ttsText = isBus ? busTTSText : trainTTSText;
  const [prevTextJa, prevTextEn] = usePrevious(ttsText);
  const [textJa, textEn] = ttsText;

  const user = useCachedInitAnonymousUser();

  const soundJaRef = useRef<Sound | null>(null);
  const soundEnRef = useRef<Sound | null>(null);

  const unduck = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: false,
      });
    } catch (e) {
      console.warn('[useTTS] Failed to unduck:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: backgroundEnabled,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
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

    // 既存のサウンドをクリーンアップ
    try {
      await soundJaRef.current?.stopAsync();
      await soundJaRef.current?.unloadAsync();
    } catch {}
    try {
      await soundEnRef.current?.stopAsync();
      await soundEnRef.current?.unloadAsync();
    } catch {}
    soundJaRef.current = null;
    soundEnRef.current = null;

    const { sound: soundJa } = await Audio.Sound.createAsync({ uri: pathJa });
    const { sound: soundEn } = await Audio.Sound.createAsync({ uri: pathEn });

    soundJaRef.current = soundJa;
    soundEnRef.current = soundEn;
    playingRef.current = true;

    const onPlaybackStatusUpdateJa = async (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          console.warn('[useTTS] soundJa error:', status.error);
          try {
            await soundJa.unloadAsync();
          } catch {}
          try {
            await soundEn.unloadAsync();
          } catch {}
          soundJaRef.current = null;
          soundEnRef.current = null;
          playingRef.current = false;
          await unduck();
        }
        return;
      }

      if (status.didJustFinish) {
        soundJa.setOnPlaybackStatusUpdate(null);
        try {
          await soundJa.unloadAsync();
        } catch (e) {
          console.warn('[useTTS] Failed to unload soundJa:', e);
        }
        soundJaRef.current = null;

        if (isLoadableRef.current) {
          soundEn.setOnPlaybackStatusUpdate(onPlaybackStatusUpdateEn);
          await soundEn.playAsync();
        } else {
          try {
            await soundEn.unloadAsync();
          } catch {}
          soundEnRef.current = null;
          playingRef.current = false;
          await unduck();
        }
      }
    };

    const onPlaybackStatusUpdateEn = async (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if (status.error) {
          console.warn('[useTTS] soundEn error:', status.error);
          try {
            await soundEn.unloadAsync();
          } catch {}
          soundEnRef.current = null;
          playingRef.current = false;
          await unduck();
        }
        return;
      }

      if (status.didJustFinish) {
        soundEn.setOnPlaybackStatusUpdate(null);
        try {
          await soundEn.unloadAsync();
        } catch (e) {
          console.warn('[useTTS] Failed to unload soundEn:', e);
        }
        soundEnRef.current = null;
        playingRef.current = false;
        await unduck();
      }
    };

    try {
      soundJa.setOnPlaybackStatusUpdate(onPlaybackStatusUpdateJa);
      await soundJa.playAsync();
    } catch (e) {
      console.error('[useTTS] Failed to play soundJa:', e);
      try {
        await soundJa.unloadAsync();
      } catch {}
      try {
        await soundEn.unloadAsync();
      } catch {}
      soundJaRef.current = null;
      soundEnRef.current = null;
      playingRef.current = false;
      await unduck();
    }
  }, [unduck]);

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
          await soundJaRef.current?.stopAsync();
        } catch {}
        try {
          await soundEnRef.current?.stopAsync();
        } catch {}
        try {
          await soundJaRef.current?.unloadAsync();
        } catch {}
        try {
          await soundEnRef.current?.unloadAsync();
        } catch {}
        soundJaRef.current = null;
        soundEnRef.current = null;
        playingRef.current = false;
        // Unduck on unmount
        try {
          await Audio.setAudioModeAsync({
            interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            shouldDuckAndroid: false,
          });
        } catch {}
      })();
    };
  }, []);
};
