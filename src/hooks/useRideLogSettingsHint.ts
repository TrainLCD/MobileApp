import { useAtomValue } from 'jotai';
import {
  rideLogEnabledAtom,
  rideLogSettingsSeenAtom,
} from '~/store/atoms/rideLog';

/**
 * 設定リストの「振り返り」の印と、フッターの設定タブのドットを出すかどうか。
 * 振り返りの設定をまだ開いておらず、振り返りも有効にしていないユーザーにだけ出す。
 * 振り返りタブの「有効にする」でオンにしたユーザーは、機能を知っているので出さない。
 *
 * どちらも atom で購読する。印を出す画面(AppSettings / FooterTabBar)は振り返りの
 * 設定から戻ってきても再マウントされないため、マウント時の値だと開いたあとも印が残る。
 */
export const useRideLogSettingsHint = (): boolean => {
  const seen = useAtomValue(rideLogSettingsSeenAtom);
  const enabled = useAtomValue(rideLogEnabledAtom);
  return !seen && !enabled;
};
