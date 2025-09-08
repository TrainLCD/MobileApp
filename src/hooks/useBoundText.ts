import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { TOEI_OEDO_LINE_ID } from '../constants';
import {
  TOEI_OEDO_LINE_RYOGOKU_STATION_ID,
  TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER,
  TOEI_OEDO_LINE_TSUKIJISHIJO_STATION_ID,
} from '../constants/station';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import stationState from '../store/atoms/station';
import { useBounds } from './useBounds';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';

export const useBoundText = (
  excludePrefixAndSuffix?: boolean
): Record<HeaderLangState, string> => {
  const { selectedBound, selectedDirection, stations } =
    useAtomValue(stationState);

  const { isLoopLine } = useLoopLine();
  const { directionalStops } = useBounds(stations);
  const currentLine = useCurrentLine();
  const currentStation = useCurrentStation();

  const boundText = useMemo(() => {
    if (!selectedBound) {
      return {
        JA: 'TrainLCD',
        EN: 'TrainLCD',
        ZH: 'TrainLCD',
        KO: 'TrainLCD',
      };
    }

    if (
      currentStation &&
      currentLine?.id === TOEI_OEDO_LINE_ID &&
      selectedBound.id !== directionalStops[0]?.id
    ) {
      if (
        selectedDirection === 'INBOUND' &&
        currentStation.id >= TOEI_OEDO_LINE_RYOGOKU_STATION_ID &&
        !excludePrefixAndSuffix
      ) {
        return {
          JA: `${directionalStops[0]?.name}経由 ${selectedBound.name}ゆき`,
          EN: `for ${selectedBound.nameRoman} via ${directionalStops[0]?.nameRoman}`,
          ZH: `经由${directionalStops[0]?.nameChinese} 开往${selectedBound.nameChinese}`,
          KO: `${directionalStops[0]?.nameKorean} 경유 ${selectedBound.nameKorean} 행`,
        };
      }
      if (
        selectedDirection === 'OUTBOUND' &&
        currentStation.id <= TOEI_OEDO_LINE_TSUKIJISHIJO_STATION_ID &&
        !excludePrefixAndSuffix
      ) {
        return {
          JA: `${directionalStops[0]?.name}経由 ${selectedBound.name}ゆき`,
          EN: `for ${selectedBound.nameRoman} via ${directionalStops[0]?.nameRoman}`,
          ZH: `经由${directionalStops[0]?.nameChinese} 开往${selectedBound.nameChinese}`,
          KO: `${directionalStops[0]?.nameKorean} 경유 ${selectedBound.nameKorean} 행`,
        };
      }

      if (
        selectedBound.id !== TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER &&
        !excludePrefixAndSuffix
      ) {
        return {
          JA: `${directionalStops[0]?.name}経由 ${selectedBound.name}ゆき`,
          EN: `for ${selectedBound.nameRoman} via ${directionalStops[0]?.nameRoman}`,
          ZH: `经由${directionalStops[0]?.nameChinese} 开往${selectedBound.nameChinese}`,
          KO: `${directionalStops[0]?.nameKorean} 경유 ${selectedBound.nameKorean} 행`,
        };
      }
    }

    if (excludePrefixAndSuffix) {
      return {
        JA: directionalStops.map((s) => s.name).join('・'),
        EN: directionalStops.map((s) => s.nameRoman).join(' & '),
        ZH: directionalStops.map((s) => s.nameChinese).join('・'),
        KO: directionalStops.map((s) => s.nameKorean).join('・'),
      };
    }

    return {
      JA: `${directionalStops.map((s) => s.name).join('・')} ${
        isLoopLine ? '方面' : 'ゆき'
      }`,
      EN: `for ${directionalStops.map((s) => s.nameRoman).join(' & ')}`,
      ZH: `开往 ${directionalStops.map((s) => s.nameChinese).join('・')}`,
      KO: `${directionalStops.map((s) => s.nameKorean).join('・')} 행`,
    };
  }, [
    currentStation,
    directionalStops,
    excludePrefixAndSuffix,
    isLoopLine,
    selectedBound,
    selectedDirection,
    currentLine?.id,
  ]);

  return { ...boundText, KANA: boundText.JA };
};
