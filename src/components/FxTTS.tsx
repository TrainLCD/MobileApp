import { useAtomValue } from 'jotai';
import type React from 'react';
import { useTTS } from '~/hooks/useTTS';
import { isTTSFeatureEnabled } from '~/lib/remoteConfig';
import speechState from '~/store/atoms/speech';

const FxTTSInner: React.FC = () => {
  useTTS();
  return null;
};

// TTS無効時は useTTSText のテキスト構築（毎tick約19ms）ごとスキップする。
// 有効化時にマウントされ直し、行先選択直後と同じ初回発話抑止から始まる。
// Remote Config のキルスイッチ(tts_enabled=false)時は、ユーザー設定が有効でも
// 再生を止める。設定画面のトグル表示(無効化)と実挙動を一致させるため。
export const FxTTS: React.FC = () => {
  const { enabled } = useAtomValue(speechState);
  return enabled && isTTSFeatureEnabled() ? <FxTTSInner /> : null;
};
