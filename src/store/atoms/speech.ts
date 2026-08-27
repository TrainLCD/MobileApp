import { atom } from 'jotai';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import {
  isTTSSpeedPreference,
  TTS_SPEED_PREFERENCE,
  type TTSSpeedPreference,
} from '~/models/TTSSpeed';
import { isDevApp } from '../../utils/isDevApp';

export interface StationState {
  enabled: boolean;
  backgroundEnabled: boolean;
  ttsEnabledLanguages: Array<'JA' | 'EN'>;
  monetizedPlanEnabled: boolean;
}

const speechState = atom<StationState>({
  enabled: false,
  backgroundEnabled: false,
  ttsEnabledLanguages: ['JA', 'EN'],
  monetizedPlanEnabled: isDevApp,
});

const restoreSpeedPreference = (): TTSSpeedPreference => {
  const stored = storage.getString(STORAGE_KEYS.TTS_SPEED_PREFERENCE);
  return isTTSSpeedPreference(stored) ? stored : TTS_SPEED_PREFERENCE.NORMAL;
};

/**
 * リモートTTSの読み上げ速度設定。他のTTS設定と異なり Permitted の
 * loadSettings(effect) では復元せず、MMKVの同期APIで初期値をここで確定する。
 * 復元前に発話が走ると、その回だけ既定速度で合成された音声がキャッシュへ
 * 積まれてしまうため。
 */
export const ttsSpeedPreferenceAtom = atom<TTSSpeedPreference>(
  restoreSpeedPreference()
);

export const resetFirstSpeechAtom = atom(0);

export default speechState;
