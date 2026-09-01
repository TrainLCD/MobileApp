import { useAtomValue } from 'jotai';
import { useState } from 'react';
import {
  portraitModeEnabledAtom,
  portraitPromoAppearanceSeenAtom,
} from '~/store/atoms/display';
import { isPortraitPromoFinished } from '~/utils/portraitPromo';

/**
 * 設定リストの印とフッタータブのドット(案C)を出すかどうか。
 *
 * 「外観画面を開いたか」は atom で購読する。印を出す画面(AppSettings /
 * FooterTabBar)は外観画面から戻ってきても再マウントされないため、
 * マウント時のスナップショットだと開いたあとも印が残る。
 *
 * 外観画面のスポットライトはこのフックを使わないこと。開いた時点で既読になる以上、
 * リアクティブに読むと自分自身を即座に閉じてしまう。そちらは
 * canShowPortraitAppearanceHint() でマウント時のスナップショットを取る。
 */
export const usePortraitPromoAppearanceHint = (): boolean => {
  // 訴求の打ち切りは起動中に他画面から変わらない(オンにすると
  // portraitModeEnabled も同時に立つ)ので、初回に確定させてよい
  const [notFinished] = useState(() => !isPortraitPromoFinished());
  const appearanceSeen = useAtomValue(portraitPromoAppearanceSeenAtom);
  const portraitModeEnabled = useAtomValue(portraitModeEnabledAtom);

  return notFinished && !appearanceSeen && !portraitModeEnabled;
};
