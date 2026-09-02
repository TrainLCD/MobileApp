import { useAtomValue } from 'jotai';
import {
  portraitModeEnabledAtom,
  portraitPromoAppearanceSeenAtom,
  portraitPromoFinishedAtom,
} from '~/store/atoms/display';

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
  const finished = useAtomValue(portraitPromoFinishedAtom);
  const appearanceSeen = useAtomValue(portraitPromoAppearanceSeenAtom);
  const portraitModeEnabled = useAtomValue(portraitModeEnabledAtom);

  return !finished && !appearanceSeen && !portraitModeEnabled;
};
