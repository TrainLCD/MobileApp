import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import type { LineDirection } from '~/models/Bound';
import {
  TOEI_OEDO_LINE_MAJOR_STATIONS_ID,
  TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_INNER,
  TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER,
  TOEI_OEDO_LINE_TSUKIJISHIJO_STATION_ID,
} from '../constants/station';
import { pendingTrainTypeAtom } from '../store/atoms/navigation';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
} from '../store/atoms/station';
import { getIsLocal } from '../utils/trainTypeString';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';

/** 方面選択カード1枚分の候補。 */
export type BoundCandidate = {
  /** リスト描画用のキー(乗車駅と方向の組で一意) */
  key: string;
  /**
   * このカードを選んだときに乗車駅として確定させる駅。
   * 同一駅が経路内に複数回現れる大江戸線都庁前のようなケースでのみ指定し、
   * それ以外は null(呼び出し側が持つ乗車駅をそのまま使う)。
   */
  boardingStation: Station | null;
  direction: LineDirection;
  /** 方面表示に使う主要駅(先頭から2駅を表示に使う) */
  stops: Station[];
};

const isTochomaeStation = (station: Station | undefined): boolean =>
  station?.id === TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER ||
  station?.id === TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_INNER;

/**
 * 大江戸線の駅配列内の特定の位置を乗車駅とみなして、その前後の主要駅を切り出す。
 * 都庁前は環状部と光が丘方面の接続点として配列に2回現れるため、
 * 「どの出現から乗るか」を index で受け取れるように独立した関数にしている。
 */
const sliceOedoBounds = (
  stations: Station[],
  stationIndex: number
): [Station[], Station[]] => {
  const boardingStation = stations[stationIndex];
  if (!boardingStation) return [[], []];

  const inboundStops = stations
    .slice(stationIndex, stations.length)
    .filter(
      (s) =>
        s.id !== boardingStation.id &&
        s.id != null &&
        TOEI_OEDO_LINE_MAJOR_STATIONS_ID.includes(s.id)
    );

  const outboundStops = stations
    .slice(0, stationIndex)
    .reverse()
    .filter(
      (s) =>
        s.id != null &&
        ((s.id !== boardingStation.id &&
          TOEI_OEDO_LINE_MAJOR_STATIONS_ID.includes(s.id)) ||
          s.id === TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER)
    )
    // NOTE: 光が丘~築地市場駅間では「都庁前」案内をしない
    .filter((s) =>
      (boardingStation.id ?? 0) >= TOEI_OEDO_LINE_TSUKIJISHIJO_STATION_ID
        ? s.id !== TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_INNER
        : true
    );

  return [inboundStops, outboundStops];
};

export const useBounds = (
  stations: Station[]
): {
  bounds: [Station[], Station[]];
  directionalStops: Station[];
  boundCandidates: BoundCandidate[];
} => {
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const pendingTrainType = useAtomValue(pendingTrainTypeAtom);
  const currentStation = useCurrentStation();

  const {
    isLoopLine,
    isOedoLine,
    inboundStationsForLoopLine,
    outboundStationsForLoopLine,
  } = useLoopLine(stations, false);

  // 大江戸線(外回り/内回りで同じ駅が2回現れる)のとき、現在地が駅配列のどの出現に
  // あたるかを解決する。idで特定できないケースはgroupIdへフォールバックする。
  const oedoCurrentStation = useMemo(() => {
    if (!isOedoLine || !stations.length) return undefined;
    // 都庁前(外回り/内回り)のようにgroupIdが同じでもidが異なる駅があるため、
    // まずidで位置を特定する(groupId一致だと配列中で先に見つかる方に固定され、
    // 実際の現在地と異なる位置を基準に行き先・経由駅の区間を切り出してしまう)。
    // ただし新宿・代々木などでは最寄り駅が他路線(JRなど)のレコードになり
    // idが大江戸線の駅リストに存在しないため、groupIdで大江戸線側の駅に読み替える。
    return (
      stations.find((s) => s.id === currentStation?.id) ??
      (currentStation?.groupId != null
        ? stations.find((s) => s.groupId === currentStation.groupId)
        : undefined)
    );
  }, [isOedoLine, stations, currentStation?.id, currentStation?.groupId]);

  const bounds = useMemo((): [Station[], Station[]] => {
    if (!stations.length) return [[], []];
    const inboundStation = stations[stations.length - 1];
    const outboundStation = stations[0];

    if (isOedoLine) {
      if (!oedoCurrentStation) return [[], []];
      return sliceOedoBounds(stations, stations.indexOf(oedoCurrentStation));
    }

    if (!pendingTrainType || getIsLocal(pendingTrainType)) {
      if (isLoopLine) {
        return [inboundStationsForLoopLine, outboundStationsForLoopLine];
      }
    }

    return [[inboundStation], [outboundStation]];
  }, [
    oedoCurrentStation,
    inboundStationsForLoopLine,
    isLoopLine,
    stations,
    outboundStationsForLoopLine,
    isOedoLine,
    pendingTrainType,
  ]);

  const boundCandidates = useMemo((): BoundCandidate[] => {
    // 都庁前は環状部の起終点かつ光が丘方面の分岐点なので、駅配列に2回出現し
    // 乗車できる方向が3つある(光が丘直通 / 六本木・大門方面の外回り /
    // 新宿西口・飯田橋方面の内回り)。inbound・outboundの2枠では表現できないため、
    // 出現ごとにカード候補を組み立てる。
    if (isOedoLine && isTochomaeStation(oedoCurrentStation)) {
      const occurrenceIndexes: number[] = [];
      for (let i = 0; i < stations.length; i++) {
        if (isTochomaeStation(stations[i])) {
          occurrenceIndexes.push(i);
        }
      }
      // 都庁前始発の光が丘方面・六本木・大門方面(=外回り側の出現)を先に並べ、
      // 環状部を大回りしてから光が丘へ向かう内回り側を最後に置く
      const orderedIndexes = [
        ...occurrenceIndexes.filter(
          (i) => stations[i]?.id === TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER
        ),
        ...occurrenceIndexes.filter(
          (i) => stations[i]?.id !== TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER
        ),
      ];

      const candidates: BoundCandidate[] = [];
      const seen = new Set<string>();
      for (const index of orderedIndexes) {
        const boardingStation = stations[index];
        if (!boardingStation) continue;
        const [inboundStops, outboundStops] = sliceOedoBounds(stations, index);

        for (const [direction, stops] of [
          ['INBOUND', inboundStops],
          ['OUTBOUND', outboundStops],
        ] as const) {
          if (!stops.length) continue;
          // 別の出現から同じ方面へ向かうカードは重複表示になるため1枚に畳む
          const dedupeKey = `${direction}-${stops[0]?.id}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          candidates.push({
            key: `${boardingStation.id}-${direction}`,
            boardingStation,
            direction,
            stops,
          });
        }
      }
      return candidates;
    }

    return (
      [
        { direction: 'INBOUND', stops: bounds[0] },
        { direction: 'OUTBOUND', stops: bounds[1] },
      ] as const
    )
      .filter(({ stops }) => stops.length)
      .map(({ direction, stops }) => ({
        key: direction,
        boardingStation: null,
        direction,
        stops,
      }));
  }, [bounds, isOedoLine, oedoCurrentStation, stations]);

  const directionalStops = useMemo(() => {
    const slicedBounds = bounds[selectedDirection === 'INBOUND' ? 0 : 1]
      .filter((s) => !!s)
      .slice(0, 2);
    if (selectedBound && !slicedBounds.length) {
      return [selectedBound];
    }
    return slicedBounds;
  }, [bounds, selectedBound, selectedDirection]);

  return { bounds, directionalStops, boundCandidates };
};
