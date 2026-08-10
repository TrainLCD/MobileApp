import { useAtomValue } from 'jotai';
import type React from 'react';
import { useTTS } from '~/hooks/useTTS';
import { useTTSFeatureEnabled } from '~/hooks/useTTSFeatureEnabled';
import speechState from '~/store/atoms/speech';

const FxTTSInner: React.FC = () => {
  useTTS();
  return null;
};

// TTS無効時は useTTSText のテキスト構築（毎tick約19ms）ごとスキップする。
// 有効化時にマウントされ直し、行先選択直後と同じ初回発話抑止から始まる。
// Remote Config のキルスイッチ(tts_enabled_ios / tts_enabled_android)が無効を示す場合は、
// ユーザー設定が有効でも
// 再生を止める。設定画面のトグル表示(無効化)と実挙動を一致させるため。
// 起動時の非同期取得完了後に false が届いたケースでも購読経由で確実にアンマウントする。
export const FxTTS: React.FC = () => {
  const { enabled } = useAtomValue(speechState);
  const ttsFeatureEnabled = useTTSFeatureEnabled();
  return enabled && ttsFeatureEnabled ? <FxTTSInner /> : null;
};
