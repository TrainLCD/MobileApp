import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import type { PreferredLanguage } from '../models/PreferredLanguage';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import { useLoopLine } from './useLoopLine';

export const useLoopLineBound = (
  reflectHeaderLanguage = true,
  preferredLanguage?: PreferredLanguage
): {
  boundFor: string;
  boundForKatakana: string;
  stations: Station[];
} | null => {
  const { headerState } = useAtomValue(navigationState);
  const { selectedDirection } = useAtomValue(stationState);

  const {
    isLoopLine,
    outboundStationsForLoopLine,
    inboundStationsForLoopLine,
  } = useLoopLine();

  const headerLangState = headerState.split('_')[1] as HeaderLangState;
  const fixedHeaderLangState: PreferredLanguage = isJapanese ? 'JA' : 'EN';

  const getBoundFor = useCallback(
    (boundStations: Station[]) => {
      if (reflectHeaderLanguage) {
        switch (headerLangState) {
          case 'EN':
            return `${boundStations.map((s) => s.nameRoman).join(' & ')}`;
          case 'ZH':
            return `${boundStations.map((s) => s.nameChinese).join('・')}`;
          case 'KO':
            return `${boundStations.map((s) => s.nameKorean).join('・')}`;
          default:
            return `${boundStations.map((s) => s.name).join('・')}`;
        }
      }

      const overrideLanguage = preferredLanguage ?? fixedHeaderLangState;

      switch (overrideLanguage) {
        case 'EN':
          return `${boundStations.map((s) => s.nameRoman).join(' & ')}`;
        default:
          return `${boundStations.map((s) => s.name).join('・')}方面`;
      }
    },
    [
      fixedHeaderLangState,
      headerLangState,
      preferredLanguage,
      reflectHeaderLanguage,
    ]
  );
  const getBoundForKatakana = useCallback((boundStations: Station[]) => {
    return `${boundStations.map((s) => s.nameKatakana).join('・')}ホウメン`;
  }, []);

  const bounds = useMemo(() => {
    switch (selectedDirection) {
      case 'INBOUND': {
        return {
          stations: inboundStationsForLoopLine,
          boundForKatakana: getBoundForKatakana(inboundStationsForLoopLine),
          boundFor: getBoundFor(inboundStationsForLoopLine),
        };
      }
      case 'OUTBOUND': {
        return {
          stations: outboundStationsForLoopLine,
          boundForKatakana: getBoundForKatakana(outboundStationsForLoopLine),
          boundFor: getBoundFor(outboundStationsForLoopLine),
        };
      }
      default:
        return null;
    }
  }, [
    getBoundFor,
    getBoundForKatakana,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
    selectedDirection,
  ]);

  if (!isLoopLine) {
    return {
      stations: [],
      boundForKatakana: '',
      boundFor: '',
    };
  }

  return bounds;
};
