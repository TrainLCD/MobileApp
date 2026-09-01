import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { APP_THEME } from '~/models/Theme';
import { themeAtom } from '~/store/atoms/theme';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import { headerStateAtom } from '../store/atoms/navigation';
import { selectedBoundAtom } from '../store/atoms/station';
import { translate } from '../translation';
import { useLoopLine } from './useLoopLine';

type UseHeaderStateTextOptions = {
  isLast: boolean;
  headerLangState: HeaderLangState;
  firstStop?: boolean;
};

type UseHeaderStateTextResult = {
  stateText: string;
  stateTextRight: string;
};

export const useHeaderStateText = ({
  isLast,
  headerLangState,
  firstStop,
}: UseHeaderStateTextOptions): UseHeaderStateTextResult => {
  const headerState = useAtomValue(headerStateAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const currentTheme = useAtomValue(themeAtom);
  const { isLoopLine } = useLoopLine();

  const stateText = useMemo<string>(() => {
    if (firstStop && selectedBound) {
      switch (headerLangState) {
        case 'EN':
          return 'For';
        case 'ZH':
          return '开往';
        default:
          return '';
      }
    }

    if (!selectedBound) {
      return translate('nowStoppingAt');
    }

    switch (headerState) {
      case 'ARRIVING':
        return translate(isLast ? 'soonLast' : 'soon');
      case 'ARRIVING_KANA':
        return translate(isLast ? 'soonKanaLast' : 'soon');
      case 'ARRIVING_EN':
        return translate(isLast ? 'soonEnLast' : 'soonEn');
      case 'ARRIVING_ZH':
        return translate(isLast ? 'soonZhLast' : 'soonZh');
      case 'ARRIVING_KO':
        return translate(isLast ? 'soonKoLast' : 'soonKo');
      case 'CURRENT':
        return translate('nowStoppingAt');
      case 'CURRENT_KANA':
        return translate('nowStoppingAt');
      case 'CURRENT_EN':
      case 'CURRENT_ZH':
      case 'CURRENT_KO':
        return '';
      case 'NEXT':
        return translate(isLast ? 'nextLast' : 'next');
      case 'NEXT_KANA':
        return translate(isLast ? 'nextKanaLast' : 'nextKana');
      case 'NEXT_EN':
        return translate(isLast ? 'nextEnLast' : 'nextEn');
      case 'NEXT_ZH':
        return translate(isLast ? 'nextZhLast' : 'nextZh');
      case 'NEXT_KO':
        return translate(isLast ? 'nextKoLast' : 'nextKo');
      default:
        return '';
    }
  }, [headerState, isLast, selectedBound, firstStop, headerLangState]);

  const stateTextRight = useMemo<string>(() => {
    if (firstStop && selectedBound) {
      // 環状線は行先が単一の終着駅ではなく方面(例: 新宿・池袋)なので、
      // 駅名に続く語も「ゆき」ではなく「方面」にする。
      switch (headerLangState) {
        case 'JA':
        case 'KANA':
          return isLoopLine ? '方面' : 'ゆき';
        case 'KO':
          return isLoopLine ? '방면' : '행';
        default:
          return '';
      }
    }
    return '';
  }, [firstStop, selectedBound, headerLangState, isLoopLine]);

  if (
    currentTheme === APP_THEME.YAMANOTE ||
    currentTheme === APP_THEME.JL ||
    currentTheme === APP_THEME.JO ||
    currentTheme === APP_THEME.JR_WEST
  ) {
    return {
      stateText: stateText.replaceAll('\n', ' '),
      stateTextRight,
    };
  }

  return { stateText, stateTextRight };
};
