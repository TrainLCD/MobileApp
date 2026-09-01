import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import { headerStateAtom } from '../store/atoms/navigation';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
} from '../store/atoms/station';
import katakanaToHiragana from '../utils/kanaToHiragana';
import { isBusLine } from '../utils/line';
import { useLoopLine } from './useLoopLine';

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
  const headerState = useAtomValue(headerStateAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const {
    isLoopLine,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
  } = useLoopLine();

  const isBus = isBusLine(currentStation?.line);

  // 環状線は一周して起点に戻るため、終着駅を出しても行先の案内にならない。
  // 行先表示(useBoundText)と同じ主要駅を使い「新宿・池袋」のような方面で見せる。
  const loopLineBoundStations = useMemo<Station[]>(() => {
    if (!isLoopLine) {
      return [];
    }
    return selectedDirection === 'INBOUND'
      ? inboundStationsForLoopLine
      : outboundStationsForLoopLine;
  }, [
    inboundStationsForLoopLine,
    isLoopLine,
    outboundStationsForLoopLine,
    selectedDirection,
  ]);

  const rawText = useMemo<string>(() => {
    if (!selectedBound) {
      return currentStation?.name ?? '';
    }

    if (firstStop) {
      if (loopLineBoundStations.length) {
        switch (headerLangState) {
          case 'KANA':
            return loopLineBoundStations
              .map((s) => katakanaToHiragana(s.nameKatakana))
              .join('・');
          case 'EN':
            return loopLineBoundStations.map((s) => s.nameRoman).join(' & ');
          case 'ZH':
            return loopLineBoundStations.map((s) => s.nameChinese).join('・');
          case 'KO':
            return loopLineBoundStations.map((s) => s.nameKorean).join('・');
          default:
            return loopLineBoundStations.map((s) => s.name).join('・');
        }
      }

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
    loopLineBoundStations,
  ]);

  return isBus ? rawText.replace(parenthesisRegexp, '') : rawText;
};
