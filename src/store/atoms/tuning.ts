import { atom } from 'jotai';
import {
  DEFAULT_BOTTOM_TRANSITION_INTERVAL,
  DEFAULT_HEADER_TRANSITION_DELAY,
  DEFAULT_HEADER_TRANSITION_INTERVAL,
  DEFAULT_TTS_VOICE_NAME,
} from '../../constants';

export type TuningState = {
  headerTransitionInterval: number;
  headerTransitionDelay: number;
  bottomTransitionInterval: number;
  devOverlayEnabled: boolean;
  untouchableModeEnabled: boolean;
  telemetryEnabled: boolean;
  ttsJaVoiceName: string;
  ttsEnVoiceName: string;
  ttsJaPrompt: string;
  ttsEnPrompt: string;
};

const tuningState = atom<TuningState>({
  headerTransitionInterval: DEFAULT_HEADER_TRANSITION_INTERVAL,
  headerTransitionDelay: DEFAULT_HEADER_TRANSITION_DELAY,
  bottomTransitionInterval: DEFAULT_BOTTOM_TRANSITION_INTERVAL,
  devOverlayEnabled: true,
  untouchableModeEnabled: false,
  telemetryEnabled: false,
  ttsJaVoiceName: DEFAULT_TTS_VOICE_NAME,
  ttsEnVoiceName: DEFAULT_TTS_VOICE_NAME,
  ttsJaPrompt: '',
  ttsEnPrompt: '',
});

export default tuningState;
