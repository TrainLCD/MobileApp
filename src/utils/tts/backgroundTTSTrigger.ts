import { Platform } from 'react-native';
import { store } from '~/store';
import lineState from '~/store/atoms/line';
import navigationState from '~/store/atoms/navigation';
import speechState from '~/store/atoms/speech';
import stationState from '~/store/atoms/station';
import { themeAtom } from '~/store/atoms/theme';
import { generateTTSText } from './generateTTSText';
import TTSPlayer from './TTSPlayer';

let firstSpeech = true;
let lastStoppingState: string | null = null;

/**
 * バックグラウンドでTTSをトリガーする
 * Androidのバックグラウンドでは、Reactコンポーネント内のuseEffectが発火しないため、
 * ここで直接TTSをトリガーする必要がある
 */
export const triggerBackgroundTTS = async (): Promise<void> => {
  // Androidのみバックグラウンド処理が必要
  // iOSはUIBackgroundModes: audioにより、Reactコンポーネントが正常動作する
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const speech = store.get(speechState);

    // TTSが無効またはバックグラウンド再生が無効なら何もしない
    if (!speech.enabled || !speech.backgroundEnabled) {
      return;
    }

    const station = store.get(stationState);
    const line = store.get(lineState);
    const navigation = store.get(navigationState);
    const theme = store.get(themeAtom);

    // 必要な情報がなければスキップ
    if (!station.selectedBound || !line.selectedLine) {
      return;
    }

    const ttsPlayer = TTSPlayer.getInstance();

    // AudioModeを設定（バックグラウンド再生有効）
    await ttsPlayer.setAudioMode(true);

    // TTSテキストを生成
    const ttsText = generateTTSText({
      stationState: station,
      lineState: line,
      navigationState: navigation,
      theme,
      firstSpeech,
    });

    if (!ttsText.length) {
      return;
    }

    const [textJa, textEn] = ttsText;

    if (!textJa || !textEn) {
      return;
    }

    // 現在のstoppingStateを計算して、変化があった場合のみ再生
    const currentStoppingState = `${station.arrived}-${station.approaching}-${station.station?.id}`;

    if (currentStoppingState === lastStoppingState) {
      return;
    }

    lastStoppingState = currentStoppingState;

    // 再生
    await ttsPlayer.speak(textJa, textEn);

    // 最初の放送フラグを更新
    if (firstSpeech) {
      firstSpeech = false;
    }
  } catch (error) {
    console.error('[backgroundTTSTrigger] Error:', error);
  }
};

/**
 * firstSpeechフラグをリセット
 * 新しい乗車セッション開始時に呼び出す
 */
export const resetFirstSpeech = (): void => {
  firstSpeech = true;
  lastStoppingState = null;
  TTSPlayer.getInstance().resetLastPlayedText();
};
