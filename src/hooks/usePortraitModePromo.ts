import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import {
  portraitModeEnabledAtom,
  portraitPromoFinishedAtom,
} from '~/store/atoms/display';
import { arrivedAtom, selectedBoundAtom } from '~/store/atoms/station';
import { untouchableModeEnabledAtom } from '~/store/atoms/tuning';
import { translate } from '~/translation';
import { showDialog } from '~/utils/dialogPresentation';
import {
  canShowPortraitPrompt,
  finishPortraitPromo,
  recordPortraitPromptDismissed,
} from '~/utils/portraitPromo';

/** この時間だけ縦持ちが続いたら「縦で見たい」とみなす */
export const PORTRAIT_HOLD_DURATION_MS = 3000;

type UsePortraitModePromoResult = {
  visible: boolean;
  enable: () => void;
  dismiss: () => void;
};

/**
 * 走行画面でポートレートモードを訴求するかどうかを決める(案A)。
 *
 * ポートレートモードが無効なまま端末を縦にすると、走行画面は中身を90度回転して
 * 横長のまま表示される(Main の landscapeKeepStyle)。つまり「縦で見たい人」は
 * この状態で検知できるので、そこだけを狙って一度だけ提案する。
 *
 * 走行中の割り込みを最小にするため、停車中(arrived)に限り、無操作モード中は出さない。
 */
export const usePortraitModePromo = (): UsePortraitModePromoResult => {
  const [portraitModeEnabled, setPortraitModeEnabled] = useAtom(
    portraitModeEnabledAtom
  );
  const arrived = useAtomValue(arrivedAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const untouchableModeEnabled = useAtomValue(untouchableModeEnabledAtom);
  const [promoFinished, setPromoFinished] = useAtom(portraitPromoFinishedAtom);
  const { width, height } = useWindowDimensions();

  // MMKV は同期 API なので初回レンダー時に提示可否が確定する
  const [eligible] = useState(() => canShowPortraitPrompt());
  const [held, setHeld] = useState(false);
  const [closed, setClosed] = useState(false);

  const isPortrait = height > width;
  const conditionsMet =
    eligible &&
    !promoFinished &&
    !closed &&
    !portraitModeEnabled &&
    !untouchableModeEnabled &&
    !!selectedBound &&
    arrived &&
    isPortrait;

  useEffect(() => {
    if (held || !conditionsMet) {
      return;
    }
    const timerId = setTimeout(() => setHeld(true), PORTRAIT_HOLD_DURATION_MS);
    return () => clearTimeout(timerId);
  }, [conditionsMet, held]);

  // 一度出したあとは発車しても引っ込めない(読んでいる途中で消えると不親切)。
  // ただし横に戻したら隠す。縦に戻せばまた出る。
  const visible = held && !closed && !portraitModeEnabled && isPortrait;

  const enable = useCallback(() => {
    setClosed(true);
    setPortraitModeEnabled(true);
    try {
      storage.set(STORAGE_KEYS.PORTRAIT_MODE_ENABLED, 'true');
      finishPortraitPromo();
      setPromoFinished(true);
    } catch (error) {
      // 保存に失敗したままだと次回起動時に設定が巻き戻るため、
      // UIと永続値の不整合を防ぐべくatom状態をロールバックする
      setPortraitModeEnabled(false);
      console.error('Failed to save portrait mode setting', error);
      showDialog(translate('errorTitle'), translate('failedToSavePreference'));
    }
  }, [setPortraitModeEnabled, setPromoFinished]);

  const dismiss = useCallback(() => {
    setClosed(true);
    recordPortraitPromptDismissed();
  }, []);

  return { visible, enable, dismiss };
};
