import { Platform } from 'react-native';
import type { Station } from '~/@types/graphql';
import { store } from '~/store';
import lineState from '~/store/atoms/line';
import navigationState from '~/store/atoms/navigation';
import speechState from '~/store/atoms/speech';
import stationState from '~/store/atoms/station';
import { themeAtom } from '~/store/atoms/theme';
import { generateTTSText } from './generateTTSText';
import {
  getAfterNextStation,
  getConnectedLines,
  getCurrentLine,
  getCurrentStation,
  getCurrentTrainType,
  getDirectionalStops,
  getLoopLineBound,
  getLoopLineInfo,
  getNextStation,
  getSlicedStations,
  getStoppingState,
  getTransferLines,
  isTerminus,
} from './helpers';
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

    // helpers.tsの関数を使ってデータを取得
    const currentLine = getCurrentLine(station, line);
    const currentStation = getCurrentStation(station);
    const nextStation = getNextStation(station, line, navigation);
    const afterNextStation = getAfterNextStation(station, line, navigation);
    const stoppingState = getStoppingState(station, line, navigation);
    const transferLines = getTransferLines(station, line, navigation);
    const connectedLines = getConnectedLines(station, line);
    const currentTrainType = getCurrentTrainType(station, line, navigation);
    const loopInfo = getLoopLineInfo(station, line, navigation);
    const loopLineBoundJa = getLoopLineBound(station, line, navigation, 'JA');
    const loopLineBoundEn = getLoopLineBound(station, line, navigation, 'EN');
    const directionalStops = getDirectionalStops(station, line, navigation);
    const slicedStationsRaw = getSlicedStations(station, line, navigation);
    const isNextStopTerminus = isTerminus(
      nextStation,
      station,
      line,
      navigation
    );
    const isAfterNextStopTerminus = isTerminus(
      afterNextStation,
      station,
      line,
      navigation
    );

    // slicedStationsの重複除去
    const slicedStations = Array.from(
      new Set(slicedStationsRaw.map((s) => s.groupId))
    )
      .map((gid) => slicedStationsRaw.find((s) => s.groupId === gid))
      .filter((s): s is Station => !!s);

    const ttsPlayer = TTSPlayer.getInstance();

    // AudioModeを設定（バックグラウンド再生有効）
    await ttsPlayer.setAudioMode(true);

    // TTSテキストを生成
    const ttsText = generateTTSText({
      theme,
      firstSpeech,
      stoppingState,
      currentLine,
      currentStation,
      nextStation,
      afterNextStation,
      selectedBound: station.selectedBound,
      transferLines,
      connectedLines,
      currentTrainType,
      isLoopLine: loopInfo.isLoopLine,
      isPartiallyLoopLine: loopInfo.isPartiallyLoopLine,
      loopLineBoundJa: loopLineBoundJa?.boundFor,
      loopLineBoundEn: loopLineBoundEn?.boundFor,
      directionalStops,
      slicedStations,
      isNextStopTerminus,
      isAfterNextStopTerminus,
    });

    if (!ttsText.length) {
      return;
    }

    const [textJa, textEn] = ttsText;

    if (!textJa || !textEn) {
      return;
    }

    // 現在のstoppingStateを計算して、変化があった場合のみ再生
    const currentStoppingStateKey = `${station.arrived}-${station.approaching}-${station.station?.id}`;

    if (currentStoppingStateKey === lastStoppingState) {
      return;
    }

    lastStoppingState = currentStoppingStateKey;

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
