import { atom } from 'jotai';
import {
  enabledLanguagesAtom,
  headerStateAtom,
} from '~/store/atoms/navigation';
import type { AvailableLanguage } from '../../constants';

export const shouldUseEnglishLineBoard = (
  headerState: string,
  enabledLanguages: AvailableLanguage[]
): boolean => {
  if (headerState.endsWith('_EN')) {
    return true;
  }
  if (headerState.endsWith('_ZH')) {
    return enabledLanguages.includes('EN');
  }
  return false;
};

export const isEnAtom = atom((get) =>
  shouldUseEnglishLineBoard(get(headerStateAtom), get(enabledLanguagesAtom))
);
