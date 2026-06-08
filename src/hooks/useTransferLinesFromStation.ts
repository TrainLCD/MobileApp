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

const stripParen = (
  text: string | null | undefined
): string | null | undefined =>
  text == null ? text : text.replace(parenthesisRegexp, '');

export const useTransferLinesFromStation = (
  station: Station | undefined,
  option?: Option
): Line[] => {
  const omitRepeatingLine = option?.omitRepeatingLine ?? false;
  const omitJR = option?.omitJR ?? false;

  const { stations } = useAtomValue(stationState);

  const transferLines = useMemo(() => {
    if (!station?.lines?.length) {
      return [];
    }

    // 乗車中の列車が直通運転で通る路線一覧
    // 同じ列車に乗ったままで到達するため乗り換え対象から外す
    const throughServiceLineIds = new Set<number>();
    for (const s of stations) {
      const id = s.line?.id;
      if (id != null) {
        throughServiceLineIds.add(id);
      }
    }

    // 隣接駅判定で何度も使うため一度だけ findIndex する。
    // findIndex が -1 (= ルート外駅を渡された) の場合 stations[-1+1]=stations[0] が
    // 「次駅」として誤って拾われるので、明示的に未検出時は undefined にする。
    const currentStationIndex = stations.findIndex((s) => s.id === station.id);
    const prevStation =
      currentStationIndex > 0 ? stations[currentStationIndex - 1] : undefined;
    const nextStation =
      currentStationIndex >= 0 ? stations[currentStationIndex + 1] : undefined;
    const stationLineId = station.line?.id;
    const stationLineNameNorm = stripParen(station.line?.nameShort);

    const filtered: Line[] = [];
    for (const line of station.lines) {
      if (!line || isBusLine(line)) continue;
      if (line.id === stationLineId) continue;
      if (stripParen(line.nameShort) === stationLineNameNorm) continue;

      // データ上の都合で路線が分かれているだけなので除外する
      // ex. JR神戸線(大阪～神戸) と JR神戸線(神戸～姫路) は実質同じ路線

      // 並走路線の判定
      if (prevStation && nextStation) {
        const inPrev = prevStation.lines?.some((pl) => pl.id === line.id);
        const inNext = nextStation.lines?.some((nl) => nl.id === line.id);
        if (
          // 次の駅から違う路線に直通している場合並走路線を乗り換え路線として出す
          nextStation.line?.id === stationLineId &&
          omitRepeatingLine &&
          inPrev &&
          inNext
        ) {
          continue;
        }
      }

      // 乗車中の列車が直通運転で通る路線は同じ列車のまま到達できるので
      // 乗り換え路線として表示しない
      if (line.id != null && throughServiceLineIds.has(line.id)) {
        continue;
      }

      filtered.push(line);
    }

    return filtered;
  }, [
    omitRepeatingLine,
    station?.id,
    station?.line?.id,
    station?.line?.nameShort,
    station?.lines,
    stations,
  ]);

  // 乗り換え路線名から括弧を除去した形に正規化する。
  // 以前は無意味な `.map((l) => l)` チェーンが含まれていたため整理した。
  return useMemo(() => {
    const base = omitJR
      ? omitJRLinesIfThresholdExceeded(transferLines)
      : transferLines;
    if (base.length === 0) return base;
    const result = new Array<Line>(base.length);
    for (let i = 0; i < base.length; i++) {
      const l = base[i];
      result[i] = {
        ...l,
        nameShort: stripParen(l.nameShort) ?? l.nameShort,
        nameRoman: stripParen(l.nameRoman) ?? l.nameRoman,
      };
    }
    return result;
  }, [transferLines, omitJR]);
};
