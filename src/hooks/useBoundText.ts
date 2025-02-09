import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { TOEI_OEDO_LINE_ID } from '../constants';
import { TOEI_OEDO_LINE_TOCHOMAE_STATION_ID } from '../constants/station';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import useBounds from './useBounds';
import { useLoopLine } from './useLoopLine';

export const useBoundText = (
  excludePrefixAndSuffix?: boolean
): Record<string, string> => {
  const { selectedLine } = useRecoilValue(lineState);
  const { selectedBound } = useRecoilValue(stationState);

  const { isLoopLine, isPartiallyLoopLine } = useLoopLine();
  const { directionalStops } = useBounds();

  const boundText = useMemo(() => {
    if (!selectedBound) {
      return {
        JA: 'TrainLCD',
        EN: 'TrainLCD',
        ZH: 'TrainLCD',
        KO: 'TrainLCD',
      };
    }

    if (directionalStops[1]?.id === 9930138) {
      if (excludePrefixAndSuffix) {
        return {
          JA: `${directionalStops[0]?.name}経由${directionalStops[1]?.name}`,
          EN: `${directionalStops[1]?.nameRoman} via ${directionalStops[0]?.nameRoman}`,
          ZH: `经由${directionalStops[0]?.nameChinese} 前往${directionalStops[1]?.nameChinese}`,
          KO: `${directionalStops[0]?.nameKorean} 경유 ${directionalStops[1]?.nameKorean}`,
        };
      }
      return {
        JA: `${directionalStops[0]?.name}経由 ${directionalStops[1]?.name}行`,
        EN: `for ${directionalStops[1]?.nameRoman} via ${directionalStops[0]?.nameRoman}`,
        ZH: `经由${directionalStops[0]?.nameChinese} 前往${directionalStops[1]?.nameChinese}`,
        KO: `${directionalStops[0]?.nameKorean} 경유 ${directionalStops[1]?.nameKorean} 행`,
      };
    }

    if (
      selectedLine?.id === TOEI_OEDO_LINE_ID &&
      directionalStops.length > 1 &&
      directionalStops[1]?.id === TOEI_OEDO_LINE_TOCHOMAE_STATION_ID
    ) {
      if (excludePrefixAndSuffix) {
        return {
          JA: `${directionalStops[0]?.name}経由${directionalStops[1]?.name}`,
          EN: `${directionalStops[1]?.nameRoman} via ${directionalStops[0]?.nameRoman}`,
          ZH: `经由${directionalStops[0]?.nameChinese} 前往${directionalStops[1]?.nameChinese}`,
          KO: `${directionalStops[0]?.nameKorean} 경유 ${directionalStops[1]?.nameKorean}`,
        };
      }
      return {
        JA: `${directionalStops[0]?.name}経由 ${directionalStops[1]?.name}行`,
        EN: `for ${directionalStops[1]?.nameRoman} via ${directionalStops[0]?.nameRoman}`,
        ZH: `经由${directionalStops[0]?.nameChinese} 前往${directionalStops[1]?.nameChinese}前`,
        KO: `${directionalStops[0]?.nameKorean} 경유 ${directionalStops[1]?.nameKorean} 행`,
      };
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
        isLoopLine || isPartiallyLoopLine ? '方面' : 'ゆき'
      }`,
      EN: `for ${directionalStops.map((s) => s.nameRoman).join(' & ')}`,
      ZH: `开往 ${directionalStops.map((s) => s.nameChinese).join('・')}`,
      KO: `${directionalStops.map((s) => s.nameKorean).join('・')} 행`,
    };
  }, [
    directionalStops,
    excludePrefixAndSuffix,
    isLoopLine,
    isPartiallyLoopLine,
    selectedBound,
    selectedLine?.id,
  ]);

  return { ...boundText, KANA: boundText.JA };
};
