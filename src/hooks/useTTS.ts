import type { AudioPlayer } from 'expo-audio';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DEV_TTS_API_URL, PRODUCTION_TTS_API_URL } from 'react-native-dotenv';
import speechState from '../store/atoms/speech';
import { isDevApp } from '../utils/isDevApp';
import { useCachedInitAnonymousUser } from './useCachedAnonymousUser';
import { usePrevious } from './usePrevious';
import { useTTSCache } from './useTTSCache';
import { useTTSText } from './useTTSText';

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

    const soundJa = createAudioPlayer({
      uri: pathJa,
    });
    const soundEn = createAudioPlayer({
      uri: pathEn,
    });

    soundJa.play();
    playingRef.current = true;

    const enRemoveListener = soundEn.addListener(
      'playbackStatusUpdate',
      (enStatus) => {
        if (enStatus.didJustFinish) {
          enRemoveListener?.remove();
          soundEn.remove();
          playingRef.current = false;
        } else if ('error' in enStatus && enStatus.error) {
          enRemoveListener?.remove();
          soundEn.remove();
          playingRef.current = false;
        }
      }
    );

    const jaRemoveListener = soundJa.addListener(
      'playbackStatusUpdate',
      (jaStatus) => {
        if (jaStatus.didJustFinish) {
          jaRemoveListener?.remove();
          soundJa.remove();
          soundEn.play();
        } else if ('error' in jaStatus && jaStatus.error) {
          jaRemoveListener?.remove();
          soundJa.remove();

          enRemoveListener?.remove();
          soundEn.remove();

          playingRef.current = false;
        }
      }
    );

    return () => {
      jaRemoveListener.remove();
      enRemoveListener.remove();

      soundJa.pause();
      soundJa.remove();
      soundEn.pause();
      soundEn.remove();
    };
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

    const idToken = await user?.getIdToken();

    const ttsJson = await (
      await fetch(ttsApiUrl, {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(reqBody),
        method: 'POST',
      })
    ).json();

    const baseDir = FileSystem.cacheDirectory;

    const pathJa = `${baseDir}/${ttsJson.result.id}_ja.mp3`;
    if (ttsJson?.result?.jaAudioContent) {
      await FileSystem.writeAsStringAsync(
        pathJa,
        ttsJson.result.jaAudioContent,
        {
          encoding: FileSystem.EncodingType.Base64,
        }
      );
    }
    const pathEn = `${baseDir}/${ttsJson.result.id}_en.mp3`;
    if (ttsJson?.result?.enAudioContent) {
      await FileSystem.writeAsStringAsync(
        pathEn,
        ttsJson.result.enAudioContent,
        {
          encoding: FileSystem.EncodingType.Base64,
        }
      );
    }

    return { id: ttsJson.result.id, pathJa, pathEn };
  }, [textEn, textJa, ttsApiUrl, user]);

  const speech = useCallback(async () => {
    if (!textJa || !textEn) {
      return;
    }
    const cache = getByText(textJa);

    if (cache) {
      const cleanup = await speakFromPath(cache.ja.path, cache.en.path);
      return cleanup;
    }

    const fetched = await fetchSpeech();
    if (!fetched) {
      return;
    }

    const { id, pathJa, pathEn } = fetched;

    store(
      id,
      { text: textJa, path: fetched.pathJa },
      { text: textEn, path: fetched.pathEn }
    );

    const cleanup = await speakFromPath(pathJa, pathEn);

    return cleanup;
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
    };
  }, []);
};
