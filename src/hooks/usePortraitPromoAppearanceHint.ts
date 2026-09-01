import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { portraitModeEnabledAtom } from '~/store/atoms/display';
import { canShowPortraitAppearanceHint } from '~/utils/portraitPromo';

/**
 * 設定リストの印とフッタータブのドット、外観画面のスポットライト(案C)を
 * 出すかどうか。外観画面を一度開くか、ポートレートモードをオンにしたら消える。
 */
export const usePortraitPromoAppearanceHint = (): boolean => {
  // MMKV は同期 API なので初回レンダー時に表示可否が確定する
  const [eligible] = useState(() => canShowPortraitAppearanceHint());
  const portraitModeEnabled = useAtomValue(portraitModeEnabledAtom);

  return eligible && !portraitModeEnabled;
};
