import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import type { Line, Station } from '~/@types/graphql';
import { isEnAtom } from '../store/selectors/isEn';

export const useIsDifferentStationName = () => {
  const isEn = useAtomValue(isEnAtom);

  const isDifferentStationName = useCallback(
    (station: Station, line: Line) => {
      if (
        // line.id === 0: 新幹線モック
        line.id === 0 ||
        // line.id === 1: JR線モック
        line.id === 1
      ) {
        return false;
      }
      if (!line.station) {
        return false;
      }

      if (isEn) {
        return (
          encodeURIComponent(
            station.nameRoman?.toLowerCase().normalize('NFD') ?? ''
          )
            .replaceAll('%CC%84', '')
            .replaceAll('%E2%80%99', '')
            .replaceAll('%20', ' ') !==
          encodeURIComponent(
            line.station.nameRoman?.toLowerCase().normalize('NFD') ?? ''
          )
            .replaceAll('%CC%84', '')
            .replaceAll('%E2%80%99', '')
            .replaceAll('%20', ' ')
        );
      }

      // nameだと市ヶ谷と市ケ谷の違い程度でも違うものとなってしまうのでよみがなで判別する
      return (
        station.name !== line.station.name &&
        station.nameKatakana !== line.station.nameKatakana
      );
    },
    [isEn]
  );
  return isDifferentStationName;
};
