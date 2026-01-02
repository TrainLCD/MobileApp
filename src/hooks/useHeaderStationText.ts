import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { type Station, TransportType } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import katakanaToHiragana from '../utils/kanaToHiragana';

type UseHeaderStationTextOptions = {
  currentStation: Station | undefined;
  nextStation: Station | undefined;
  headerLangState: HeaderLangState;
  firstStop?: boolean;
};

export const useHeaderStationText = ({
  currentStation,
  nextStation,
  headerLangState,
  firstStop,
}: UseHeaderStationTextOptions): string => {
  const { headerState } = useAtomValue(navigationState);
  const { selectedBound } = useAtomValue(stationState);

  const isBus = currentStation?.line?.transportType === TransportType.Bus;

  const rawText = useMemo<string>(() => {
    if (!selectedBound) {
      return currentStation?.name ?? '';
    }

    if (firstStop) {
      switch (headerLangState) {
        case 'JA':
          return selectedBound.name ?? '';
        case 'KANA':
          return katakanaToHiragana(selectedBound.nameKatakana ?? '');
        case 'EN':
          return selectedBound.nameRoman ?? '';
        case 'ZH':
          return selectedBound.nameChinese ?? '';
        case 'KO':
          return selectedBound.nameKorean ?? '';
        default:
          return selectedBound.name ?? '';
      }
    }

    switch (headerState) {
      case 'ARRIVING':
        return nextStation?.name ?? '';
      case 'ARRIVING_KANA':
        return katakanaToHiragana(nextStation?.nameKatakana);
      case 'ARRIVING_EN': {
        return nextStation?.nameRoman ?? '';
      }
      case 'ARRIVING_ZH': {
        return nextStation?.nameChinese ?? '';
      }
      case 'ARRIVING_KO': {
        return nextStation?.nameKorean ?? '';
      }
      case 'CURRENT':
        return currentStation?.name ?? '';
      case 'CURRENT_KANA':
        return katakanaToHiragana(currentStation?.nameKatakana);
      case 'CURRENT_EN': {
        return currentStation?.nameRoman ?? '';
      }
      case 'CURRENT_ZH': {
        return currentStation?.nameChinese ?? '';
      }
      case 'CURRENT_KO': {
        return currentStation?.nameKorean ?? '';
      }
      case 'NEXT': {
        return nextStation?.name ?? '';
      }
      case 'NEXT_KANA':
        return katakanaToHiragana(nextStation?.nameKatakana);
      case 'NEXT_EN':
        return nextStation?.nameRoman ?? '';
      case 'NEXT_ZH':
        return nextStation?.nameChinese ?? '';
      case 'NEXT_KO':
        return nextStation?.nameKorean ?? '';
      default:
        return '';
    }
  }, [
    currentStation?.name,
    currentStation?.nameChinese,
    currentStation?.nameKatakana,
    currentStation?.nameKorean,
    currentStation?.nameRoman,
    headerState,
    nextStation?.name,
    nextStation?.nameChinese,
    nextStation?.nameKatakana,
    nextStation?.nameKorean,
    nextStation?.nameRoman,
    selectedBound,
    firstStop,
    headerLangState,
  ]);

  return isBus ? rawText.replace(parenthesisRegexp, '') : rawText;
};
