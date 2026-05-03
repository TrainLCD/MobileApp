import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Line, Station } from '~/@types/graphql';
import { isBusLine } from '~/utils/line';
import { parenthesisRegexp } from '../constants';
import stationState from '../store/atoms/station';
import omitJRLinesIfThresholdExceeded from '../utils/jr';

type Option = {
  omitRepeatingLine?: boolean;
  omitJR?: boolean;
};

export const useTransferLinesFromStation = (
  station: Station | undefined,
  option?: Option
): Line[] => {
  const { omitRepeatingLine, omitJR } = option ?? {
    omitRepeatingLine: false,
    omitJR: false,
  };

  const { stations } = useAtomValue(stationState);

  const transferLines = useMemo(() => {
    // 乗車中の列車が直通運転で通る路線一覧
    // 同じ列車に乗ったままで到達するため乗り換え対象から外す
    const throughServiceLineIds = new Set(
      stations.map((s) => s.line?.id).filter((id): id is number => id != null)
    );

    return (
      station?.lines
        ?.filter((line) => !isBusLine(line))
        ?.filter((line) => line.id !== station.line?.id)
        // カッコを除いて路線名が同じということは、
        // データ上の都合で路線が分かれているだけなので除外する
        // ex. JR神戸線(大阪～神戸) と JR神戸線(神戸～姫路) は実質同じ路線
        .filter(
          (line) =>
            line.nameShort?.replace(parenthesisRegexp, '') !==
            station.line?.nameShort?.replace(parenthesisRegexp, '')
        )
        .filter((line) => {
          const currentStationIndex = stations.findIndex(
            (s) => s.id === station.id
          );
          const prevStation = stations[currentStationIndex - 1];
          const nextStation = stations[currentStationIndex + 1];
          if (!prevStation || !nextStation) {
            return true;
          }
          const hasSameLineInPrevStationLine = prevStation.lines?.some(
            (pl) => pl.id === line.id
          );
          const hasSameLineInNextStationLine = nextStation.lines?.some(
            (nl) => nl.id === line.id
          );

          if (
            // 次の駅から違う路線に直通している場合並走路線を乗り換え路線として出す
            nextStation.line?.id !== station.line?.id
          ) {
            return true;
          }
          if (
            omitRepeatingLine &&
            hasSameLineInPrevStationLine &&
            hasSameLineInNextStationLine
          ) {
            return false;
          }
          return true;
        })
        // 乗車中の列車が直通運転で通る路線は同じ列車のまま到達できるので
        // 乗り換え路線として表示しない
        .filter((line) => {
          if (line.id == null) {
            return true;
          }
          return !throughServiceLineIds.has(line.id);
        })
    );
  }, [
    omitRepeatingLine,
    station?.id,
    station?.line?.id,
    station?.line?.nameShort,
    station?.lines,
    stations,
  ]);

  if (omitJR) {
    return omitJRLinesIfThresholdExceeded(transferLines ?? [])
      .map((l) => ({
        ...l,
        nameShort: l.nameShort?.replace(parenthesisRegexp, ''),
        nameRoman: l.nameRoman?.replace(parenthesisRegexp, ''),
      }))
      .map((l) => l);
  }

  return (transferLines ?? [])
    .map((l) => ({
      ...l,
      nameShort: l.nameShort?.replace(parenthesisRegexp, ''),
      nameRoman: l.nameRoman?.replace(parenthesisRegexp, ''),
    }))
    .map((l) => l);
};
