import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { TransportType } from '~/@types/graphql';
import speechState from '../store/atoms/speech';
import TTSPlayer from '../utils/tts/TTSPlayer';
import { useBusTTSText } from './useBusTTSText';
import { useCachedInitAnonymousUser } from './useCachedAnonymousUser';
import { useCurrentLine } from './useCurrentLine';
import { usePrevious } from './usePrevious';
import { useTTSText } from './useTTSText';

export const useTTS = (): void => {
  const { enabled, backgroundEnabled } = useAtomValue(speechState);
  const currentLine = useCurrentLine();
  const ttsPlayer = TTSPlayer.getInstance();

  const trainTTSText = useTTSText(ttsPlayer.isFirstSpeech(), enabled);
  const busTTSText = useBusTTSText(ttsPlayer.isFirstSpeech(), enabled);
  const ttsText =
    currentLine?.transportType === TransportType.Bus
      ? busTTSText
      : trainTTSText;
  const [prevTextJa, prevTextEn] = usePrevious(ttsText);
  const [textJa, textEn] = ttsText;

  const user = useCachedInitAnonymousUser();

  // バックグラウンドTTS用にgetIdTokenを設定
  useEffect(() => {
    if (user) {
      ttsPlayer.setGetIdToken(() => user.getIdToken());
    }
  }, [user, ttsPlayer]);

  // AudioMode設定
  useEffect(() => {
    ttsPlayer.setAudioMode(backgroundEnabled);
  }, [backgroundEnabled, ttsPlayer]);

  // TTS再生トリガー
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 同じテキストならスキップ
    if (prevTextJa === textJa && prevTextEn === textEn) {
      return;
    }

    if (!textJa || !textEn) {
      return;
    }

    // 再生中ならスキップ
    if (ttsPlayer.isCurrentlyPlaying()) {
      return;
    }

    // 既に同じテキストが再生済みならスキップ
    if (ttsPlayer.getLastPlayedTextJa() === textJa) {
      return;
    }

    (async () => {
      try {
        await ttsPlayer.speak(textJa, textEn);
        // 最初の放送フラグを更新
        if (ttsPlayer.isFirstSpeech()) {
          ttsPlayer.setFirstSpeechDone();
        }
      } catch (err) {
        console.error('[useTTS] speak error:', err);
      }
    })();
  }, [enabled, prevTextEn, prevTextJa, textEn, textJa, ttsPlayer]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      ttsPlayer.stop();
    };
  }, [ttsPlayer]);
};
