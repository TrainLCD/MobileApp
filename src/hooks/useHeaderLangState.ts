import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';

export const useHeaderLangState = (): HeaderLangState => {
  const { headerState } = useAtomValue(navigationState);

  return useMemo(
    () =>
      headerState.split('_')[1]?.length
        ? (headerState.split('_')[1] as HeaderLangState)
        : ('JA' as HeaderLangState),
    [headerState]
  );
};
