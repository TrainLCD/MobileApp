import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
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

  // firstSpeechをローカルステートで管理し、
  // フラグ変更だけによる不要なテキスト再生成・再再生を防ぐ
  const [localFirstSpeech, setLocalFirstSpeech] = useState(
    ttsPlayer.isFirstSpeech()
  );

  // TTSPlayerがリセットされた場合の同期（新しいトリップ開始時）
  if (ttsPlayer.isFirstSpeech() && !localFirstSpeech) {
    setLocalFirstSpeech(true);
  }

  const trainTTSText = useTTSText(localFirstSpeech, enabled);
  const busTTSText = useBusTTSText(localFirstSpeech, enabled);
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

    // 初回放送後にfirstSpeechフラグが変わりテキストが変化した場合、
    // ローカルステートを更新して正しいテキストで再レンダリングさせる
    if (localFirstSpeech && !ttsPlayer.isFirstSpeech()) {
      setLocalFirstSpeech(false);
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
  }, [
    enabled,
    localFirstSpeech,
    prevTextEn,
    prevTextJa,
    textEn,
    textJa,
    ttsPlayer,
  ]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      ttsPlayer.stop();
    };
  }, [ttsPlayer]);
};
