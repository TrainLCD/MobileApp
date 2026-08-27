import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Line, Station } from '~/@types/graphql';
import {
  DISNEY_RESORT_LINE_ID,
  MEIJO_LINE_ID,
  OSAKA_LOOP_LINE_ID,
  TOEI_OEDO_LINE_ID,
  YAMANOTE_LINE_ID,
} from '~/constants';
import { isBusLine } from '~/utils/line';
import { parenthesisRegexp } from '../constants';
import { stationsAtom } from '../store/atoms/station';
import omitJRLinesIfThresholdExceeded from '../utils/jr';

// StationAPI の駅IDは `路線ID * 100 + 路線内の連番(1始まり)` で構成される。
// ex. 相鉄本線(29001)の横浜は 2900101、西谷は 2900108
// 路線の全駅一覧はこのフックからは引けないため、この規約を頼りに
// 「現在駅が路線の起点か」「経路が現在駅より終点側しか通っていないか」を判定する。
const STATION_SEQUENCE_BASE = 100;

const getLineIdFromStationId = (stationId: number): number =>
  Math.floor(stationId / STATION_SEQUENCE_BASE);

const getStationSequenceFromStationId = (stationId: number): number =>
  stationId % STATION_SEQUENCE_BASE;

// 環状運転する路線は乗り換えずとも一周して反対方向の駅へ到達できるため、
// 「逆方向が経路に含まれない」判定の対象から外す
const LOOP_LINE_ID_SET = new Set<number>([
  YAMANOTE_LINE_ID,
  OSAKA_LOOP_LINE_ID,
  MEIJO_LINE_ID,
  TOEI_OEDO_LINE_ID,
  DISNEY_RESORT_LINE_ID,
]);

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

  const stations = useAtomValue(stationsAtom);

  const transferLines = useMemo(() => {
    if (!station?.lines?.length) {
      return [];
    }

    // 乗車中の列車が直通運転で通る路線一覧
    // 同じ列車に乗ったままで到達するため乗り換え対象から外す
    const throughServiceLineIds = new Set<number>();
    // 直通で通る路線ごとに、現在駅以外で経路上に現れる駅IDの最小値を控えておく。
    // 同一路線内の駅IDは起点からの連番なので、この最小値と現在駅のIDを比べると
    // 経路が現在駅より終点側しか通っていないかどうかが分かる。
    const minRouteStationIdByLineId = new Map<number, number>();
    for (const s of stations) {
      const id = s.line?.id;
      if (id == null) {
        continue;
      }
      throughServiceLineIds.add(id);

      // 現在駅そのもの(路線ごとに別レコードになる)は起点側判定の材料にならない
      if (s.groupId != null && s.groupId === station.groupId) {
        continue;
      }
      const stationId = s.id;
      if (stationId == null || getLineIdFromStationId(stationId) !== id) {
        continue;
      }
      const currentMin = minRouteStationIdByLineId.get(id);
      if (currentMin == null || stationId < currentMin) {
        minRouteStationIdByLineId.set(id, stationId);
      }
    }

    // 直通先の路線であっても、分岐駅では「乗り換えないと到達できない方向」が残る。
    // ex. 相鉄新横浜線から相鉄本線へ直通する西谷では、海老名方面へはそのまま行けるが
    //     横浜方面(＝本線の起点側)は経路外なので乗換案内に残す必要がある。
    // 経路が現在駅より終点側しか通っておらず、かつ現在駅が路線の起点でない場合に true。
    // 逆に終点側が経路外となるケース(ex. 立川での中央線高尾方面)は路線の終端IDが
    // 分からないため判定できず、従来通り除外される。
    const hasUnreachableSectionOnOriginSide = (line: Line): boolean => {
      const lineId = line.id;
      const stationIdOnLine = line.station?.id;
      if (lineId == null || stationIdOnLine == null) {
        return false;
      }
      if (LOOP_LINE_ID_SET.has(lineId)) {
        return false;
      }
      // 駅IDが規約通りでない場合は判定できないため従来の挙動に倒す
      if (getLineIdFromStationId(stationIdOnLine) !== lineId) {
        return false;
      }
      // 現在駅がその路線の起点なら起点側の区間自体が存在しない
      if (getStationSequenceFromStationId(stationIdOnLine) <= 1) {
        return false;
      }
      const minRouteStationId = minRouteStationIdByLineId.get(lineId);
      if (minRouteStationId == null) {
        return false;
      }
      return minRouteStationId > stationIdOnLine;
    };

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
      // 乗り換え路線として表示しない。
      // ただし分岐駅で逆方向の区間が経路に含まれない場合は乗り換えが必要なため残す。
      if (
        line.id != null &&
        throughServiceLineIds.has(line.id) &&
        !hasUnreachableSectionOnOriginSide(line)
      ) {
        continue;
      }

      filtered.push(line);
    }

    return filtered;
  }, [
    omitRepeatingLine,
    station?.groupId,
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
