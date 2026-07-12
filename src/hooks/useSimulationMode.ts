import * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  GetTrainRouteQuery,
  GetTrainRouteQueryVariables,
} from '~/@types/graphql';
import { LOCATION_TASK_NAME } from '~/constants';
import { GET_TRAIN_ROUTE } from '~/lib/graphql/queries';
import { store } from '~/store';
import { locationAtom } from '~/store/atoms/location';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import { resetFirstSpeechAtom } from '~/store/atoms/speech';
import { generateTrainSpeedProfile } from '~/utils/trainSpeed';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getIsPass from '../utils/isPass';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useGraphQLQuery } from './useGraphQLQuery';
import { useLoopLine } from './useLoopLine';

// 終点到着後、方面を逆転して折り返すまでの待機時間。
// step のインターバルが1秒間隔のため、ティック数（≒秒数）としてそのまま扱う。
const TERMINAL_DWELL_TICKS = 60;

export const useSimulationMode = (): void => {
  const currentStation = useAtomValue(stationAtom);
  const rawStations = useAtomValue(stationsAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const autoModeEnabled = useAtomValue(autoModeEnabledAtom);

  const currentStationRef = useRef(currentStation);
  currentStationRef.current = currentStation;

  const trainType = useCurrentTrainType();
  const { isLoopLine } = useLoopLine();

  const segmentIndexRef = useRef(0);
  const childIndexRef = useRef(0);
  const speedProfilesRef = useRef<number[][]>([]);
  const segmentProgressDistanceRef = useRef(0);
  const dwellPendingRef = useRef(false);
  // 終点到着後、方面を逆転して折り返すまで終点で停車し続けたティック数
  const terminalDwellCountRef = useRef(0);
  // 方面逆転中フラグ。新しい進行方向の速度プロファイルが再生成されるまで
  // 終点で停車したまま待機し、旧方向のプロファイル/ジオメトリでの誤stepを防ぐ。
  const reversingRef = useRef(false);
  // 区間ごとの (waypoints, cumulativeDistances) キャッシュ。
  // step() は毎秒呼ばれる。区間が変わらない限り cumulativeDistances は同じなので、
  // waypoints 毎の getDistance / reduce を毎ティック走らせる必要は無い。
  type SegmentGeometry = {
    waypoints: { latitude: number; longitude: number }[];
    cumulativeDistances: number[];
    totalDistance: number;
  };
  const segmentGeometryCacheRef = useRef<SegmentGeometry[]>([]);

  const stations = useMemo(
    () => dropEitherJunctionStation(rawStations, selectedDirection),
    [rawStations, selectedDirection]
  );

  const maybeRevsersedStations = useMemo(
    () =>
      // ループ線では INBOUND/OUTBOUND の進行方向が非ループ線と逆になる
      (
        isLoopLine
          ? selectedDirection !== 'INBOUND'
          : selectedDirection === 'INBOUND'
      )
        ? stations
        : stations.slice().reverse(),
    [stations, selectedDirection, isLoopLine]
  );

  const enabled = useMemo(() => {
    return autoModeEnabled;
  }, [autoModeEnabled]);

  // シミュレーション区間全体 (先頭駅→末尾駅) の距離・最高速度・加減速度を
  // バックエンドから取得し、路線種別/種別ベースの定数テーブルを廃してサーバー側の
  // 実測値に委譲する。
  const fromStationId = maybeRevsersedStations[0]?.id;
  const toStationId = maybeRevsersedStations.at(-1)?.id;

  const { data: trainRouteData, error: trainRouteError } = useGraphQLQuery<
    GetTrainRouteQuery,
    GetTrainRouteQueryVariables
  >(GET_TRAIN_ROUTE, {
    variables: {
      fromStationId: fromStationId ?? 0,
      toStationId: toStationId ?? 0,
      lineGroupId: trainType?.groupId,
    },
    skip:
      !enabled ||
      fromStationId == null ||
      toStationId == null ||
      fromStationId === toStationId,
  });

  const resolveStartIndex = useCallback((): number => {
    const cs = currentStationRef.current;
    const directIndex = maybeRevsersedStations.findIndex(
      (s) => s.id === cs?.id
    );
    if (directIndex !== -1 && !getIsPass(maybeRevsersedStations[directIndex])) {
      return directIndex;
    }

    // 対象路線に含まれない駅の場合、座標から路線上の最寄り停車駅を探す
    if (cs?.latitude != null && cs?.longitude != null) {
      let minDistance = Number.POSITIVE_INFINITY;
      let nearestIndex = 0;
      for (let idx = 0; idx < maybeRevsersedStations.length; idx++) {
        const s = maybeRevsersedStations[idx];
        if (getIsPass(s)) {
          continue;
        }
        if (s.latitude != null && s.longitude != null) {
          const d = getDistance(
            {
              latitude: cs.latitude,
              longitude: cs.longitude,
            },
            { latitude: s.latitude, longitude: s.longitude }
          );
          if (d < minDistance) {
            minDistance = d;
            nearestIndex = idx;
          }
        }
      }
      return nearestIndex;
    }

    return 0;
  }, [maybeRevsersedStations]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const stopLocationUpdates = async () => {
      const hasStarted =
        await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    };

    stopLocationUpdates();
  }, [enabled]);

  // trainRoute クエリのエラーをログに記録
  useEffect(() => {
    if (trainRouteError) {
      console.error(
        '[useSimulationMode] trainRoute query error:',
        trainRouteError
      );
    }
  }, [trainRouteError]);

  useEffect(() => {
    const segments = trainRouteData?.trainRoute?.segments;
    if (!segments || segments.length === 0) {
      return;
    }

    // trainRoute は fromStationId(= maybeRevsersedStations[0])→toStationId(= 末尾)の
    // 並びで1駅1セグメントを返すため、駅IDではなく配列位置で対応付ける。
    // 同一駅IDが非隣接位置に複数回出現するケース(接続駅の再登場等)があり、
    // ID をキーにしたルックアップだと後勝ちで別位置の値を誤って使ってしまうため。
    const speedProfiles: number[][] = new Array(maybeRevsersedStations.length);
    const segmentGeometry: SegmentGeometry[] = new Array(
      maybeRevsersedStations.length
    );
    const emptyGeometry: SegmentGeometry = {
      waypoints: [],
      cumulativeDistances: [],
      totalDistance: 0,
    };

    for (
      let curMapIndex = 0;
      curMapIndex < maybeRevsersedStations.length;
      curMapIndex++
    ) {
      const cur = maybeRevsersedStations[curMapIndex];
      if (!cur || getIsPass(cur)) {
        // 通過駅は速度プロファイル生成対象外
        speedProfiles[curMapIndex] = [];
        segmentGeometry[curMapIndex] = emptyGeometry;
        continue;
      }

      // 次の停車駅インデックスを線形探索
      let nextStationIndex = -1;
      for (let i = curMapIndex + 1; i < maybeRevsersedStations.length; i++) {
        const s = maybeRevsersedStations[i];
        if (s && !getIsPass(s)) {
          nextStationIndex = i;
          break;
        }
      }
      if (nextStationIndex === -1) {
        speedProfiles[curMapIndex] = [];
        segmentGeometry[curMapIndex] = emptyGeometry;
        continue;
      }
      const next = maybeRevsersedStations[nextStationIndex];
      const arrivalSegment = segments[nextStationIndex];
      if (
        !next ||
        cur.latitude == null ||
        cur.longitude == null ||
        next.latitude == null ||
        next.longitude == null ||
        arrivalSegment?.maxSpeed == null ||
        arrivalSegment?.maxAcceleration == null ||
        arrivalSegment?.maxDeceleration == null
      ) {
        speedProfiles[curMapIndex] = [];
        segmentGeometry[curMapIndex] = emptyGeometry;
        continue;
      }

      // step() で参照する waypoints と累積距離を一度だけ計算してキャッシュする。
      // 距離は trainRoute の distanceFromPrevious を積算する(直線距離ではなく
      // 実際の線路長ベースの値をサーバーから取得できる)。
      const waypoints: { latitude: number; longitude: number }[] = [
        {
          latitude: cur.latitude as number,
          longitude: cur.longitude as number,
        },
      ];
      const cumulative: number[] = [0];
      let distanceForNextStation = 0;
      for (let idx = curMapIndex + 1; idx <= nextStationIndex; idx++) {
        const wp = maybeRevsersedStations[idx];
        if (!wp || wp.latitude == null || wp.longitude == null) {
          continue;
        }
        distanceForNextStation += segments[idx]?.distanceFromPrevious ?? 0;
        waypoints.push({
          latitude: wp.latitude as number,
          longitude: wp.longitude as number,
        });
        cumulative.push(distanceForNextStation);
      }

      segmentGeometry[curMapIndex] = {
        waypoints,
        cumulativeDistances: cumulative,
        totalDistance: distanceForNextStation,
      };

      const speedProfile = generateTrainSpeedProfile({
        distance: distanceForNextStation,
        maxSpeed: arrivalSegment.maxSpeed,
        accel: arrivalSegment.maxAcceleration,
        decel: arrivalSegment.maxDeceleration,
        interval: 1,
      });

      let profileDistance = 0;
      for (let i = 0; i < speedProfile.length; i++) {
        profileDistance += speedProfile[i] ?? 0;
      }
      if (profileDistance === 0) {
        speedProfiles[curMapIndex] = speedProfile.map(() => 0);
      } else {
        const ratio = distanceForNextStation / profileDistance;
        const corrected = new Array<number>(speedProfile.length);
        for (let i = 0; i < speedProfile.length; i++) {
          corrected[i] = (speedProfile[i] ?? 0) * ratio;
        }
        speedProfiles[curMapIndex] = corrected;
      }
    }

    segmentIndexRef.current = resolveStartIndex();
    speedProfilesRef.current = speedProfiles;
    segmentGeometryCacheRef.current = segmentGeometry;
    childIndexRef.current = 0;
    segmentProgressDistanceRef.current = 0;
    dwellPendingRef.current = false;
    terminalDwellCountRef.current = 0;
    // 新しい方向の速度プロファイルが揃ったので折り返し待機を解除する
    reversingRef.current = false;
  }, [maybeRevsersedStations, trainRouteData, resolveStartIndex]);

  const step = useCallback(
    (speed: number) => {
      if (maybeRevsersedStations.length === 0) {
        return;
      }

      // 駅リスト更新でsegmentIndexが不正化しても自動進行が止まらないように正規化する
      const normalizedSegmentIndex = Math.min(
        Math.max(segmentIndexRef.current, 0),
        maybeRevsersedStations.length - 1
      );
      if (normalizedSegmentIndex !== segmentIndexRef.current) {
        segmentIndexRef.current = normalizedSegmentIndex;
        childIndexRef.current = 0;
        segmentProgressDistanceRef.current = 0;
      }

      const geometry = segmentGeometryCacheRef.current[normalizedSegmentIndex];
      // geometry が空 (= 当該駅から先に停車駅が無い / 通過駅) の場合は終端扱い
      if (!geometry || geometry.waypoints.length === 0) {
        segmentIndexRef.current = 0;
        childIndexRef.current = 0;
        segmentProgressDistanceRef.current = 0;
        const firstStation = maybeRevsersedStations[0];
        if (firstStation?.latitude != null && firstStation?.longitude != null) {
          store.set(locationAtom, {
            timestamp: Date.now(),
            coords: {
              latitude: firstStation.latitude,
              longitude: firstStation.longitude,
              accuracy: 0,
              altitude: null,
              altitudeAccuracy: null,
              speed: 0,
              heading: null,
            },
          });
        }
        return;
      }

      const { waypoints, cumulativeDistances, totalDistance } = geometry;
      const progressedDistance = segmentProgressDistanceRef.current + speed;
      const nextProgressDistance = Math.min(progressedDistance, totalDistance);
      const moveDistance = Math.max(
        0,
        nextProgressDistance - segmentProgressDistanceRef.current
      );

      // 累積距離は単調増加なので二分探索で targetWaypointIndex を求める。
      // findIndex の線形走査より小さい区間でも O(log n) で済む。
      let lo = 0;
      let hi = cumulativeDistances.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if ((cumulativeDistances[mid] ?? 0) >= nextProgressDistance) {
          hi = mid;
        } else {
          lo = mid + 1;
        }
      }
      const targetWaypointIndex = lo;

      const targetWaypoint = waypoints[targetWaypointIndex];
      if (!targetWaypoint) {
        return;
      }

      let targetLatitude = targetWaypoint.latitude;
      let targetLongitude = targetWaypoint.longitude;

      if (targetWaypointIndex > 0) {
        const prevWaypoint = waypoints[targetWaypointIndex - 1];
        const prevDistance = cumulativeDistances[targetWaypointIndex - 1] ?? 0;
        const targetDistance = cumulativeDistances[targetWaypointIndex] ?? 0;
        const distanceDelta = targetDistance - prevDistance;

        if (prevWaypoint && distanceDelta > 0) {
          const ratio = (nextProgressDistance - prevDistance) / distanceDelta;
          targetLatitude =
            prevWaypoint.latitude +
            (targetWaypoint.latitude - prevWaypoint.latitude) * ratio;
          targetLongitude =
            prevWaypoint.longitude +
            (targetWaypoint.longitude - prevWaypoint.longitude) * ratio;
        }
      }

      store.set(locationAtom, {
        timestamp: Date.now(),
        coords: {
          latitude: targetLatitude,
          longitude: targetLongitude,
          accuracy: 0,
          altitude: null,
          altitudeAccuracy: null,
          speed: moveDistance,
          heading: null,
        },
      });
      segmentProgressDistanceRef.current = nextProgressDistance;
    },
    [maybeRevsersedStations]
  );

  useEffect(() => {
    if (!enabled || stations.length === 0) {
      return;
    }

    // アプリが認識している現在駅から開始位置を決定
    const targetIndex = resolveStartIndex();
    const targetStation = maybeRevsersedStations[targetIndex];

    if (targetStation?.latitude != null && targetStation?.longitude != null) {
      store.set(locationAtom, {
        timestamp: Date.now(),
        coords: {
          accuracy: null,
          altitude: null,
          altitudeAccuracy: null,
          speed: null,
          heading: null,
          latitude: targetStation.latitude,
          longitude: targetStation.longitude,
        },
      });
      segmentIndexRef.current = targetIndex;
      childIndexRef.current = 0;
      segmentProgressDistanceRef.current = 0;
    }
  }, [enabled, stations.length, maybeRevsersedStations, resolveStartIndex]);

  useEffect(() => {
    if (!enabled || !selectedDirection) {
      return;
    }

    const intervalId = setInterval(() => {
      const i = childIndexRef.current;

      const speeds = speedProfilesRef.current[segmentIndexRef.current] ?? [];

      // 方面逆転中は新方向の速度プロファイルが再生成されるまで終点で停車して待つ。
      // 旧方向のプロファイル/ジオメトリで step すると位置が飛ぶため、ここで待機する。
      if (reversingRef.current) {
        const prev = store.get(locationAtom);
        if (prev) {
          store.set(locationAtom, {
            timestamp: Date.now(),
            coords: {
              ...prev.coords,
              speed: 0,
              heading: null,
            },
          });
        }
        return;
      }

      if (dwellPendingRef.current) {
        const prev = store.get(locationAtom);
        if (prev) {
          store.set(locationAtom, {
            timestamp: Date.now(),
            coords: {
              ...prev.coords,
              speed: 0,
              heading: null,
            },
          });
        }
        const nextSegmentIndex = speedProfilesRef.current.findIndex(
          (seg, idx) => seg.length > 0 && idx > segmentIndexRef.current
        );

        if (nextSegmentIndex === -1) {
          if (isLoopLine) {
            // ループ線には折り返す終点が無いため、従来どおり先頭に戻って
            // 同一方向のまま周回を続ける。
            const firstStation = maybeRevsersedStations[0];
            if (
              prev &&
              firstStation?.latitude != null &&
              firstStation?.longitude != null
            ) {
              store.set(locationAtom, {
                timestamp: Date.now(),
                coords: {
                  ...prev.coords,
                  latitude: firstStation.latitude,
                  longitude: firstStation.longitude,
                  speed: 0,
                  heading: null,
                },
              });
            }
            segmentIndexRef.current = 0;
            childIndexRef.current = 0;
            segmentProgressDistanceRef.current = 0;
            dwellPendingRef.current = false;
            return;
          }

          // 終点に到達。すぐには折り返さず、約1分間そのまま停車してから
          // 方面(selectedDirection / selectedBound)を逆転させて折り返す。
          if (terminalDwellCountRef.current < TERMINAL_DWELL_TICKS) {
            terminalDwellCountRef.current += 1;
            return;
          }

          // 待機完了 → 方面を逆転する。maybeRevsersedStations と trainRoute は
          // どちらも selectedDirection に依存して再計算されるため、方向を反転すれば
          // 終点始発の折り返し運転として自然にシミュレーションが継続する。
          terminalDwellCountRef.current = 0;
          dwellPendingRef.current = false;
          reversingRef.current = true;
          const reversedDirection =
            selectedDirection === 'INBOUND' ? 'OUTBOUND' : 'INBOUND';
          // 反転後の進行方向は現在の maybeRevsersedStations の逆順になるため、
          // 折り返し後の行き先(selectedBound)は現在の始発駅にあたる先頭要素。
          store.set(selectedBoundAtom, maybeRevsersedStations[0] ?? null);
          store.set(selectedDirectionAtom, reversedDirection);
          // 折り返し後は新しい行き先として初回放送(この電車は〜行きです)を再発火させる。
          // resetFirstSpeechAtom を進めると useTTS 側で firstSpeech が true に戻り、
          // 行き先変更 + 発車後(arrived=false)に初回TTSが改めて再生される。
          store.set(resetFirstSpeechAtom, store.get(resetFirstSpeechAtom) + 1);
          return;
        }

        segmentIndexRef.current = nextSegmentIndex;
        childIndexRef.current = 0;
        segmentProgressDistanceRef.current = 0;
        dwellPendingRef.current = false;
        return;
      }

      if (i >= speeds.length) {
        dwellPendingRef.current = true;
        return;
      }

      const speed = speeds[i];

      step(speed);
      childIndexRef.current += 1;
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, isLoopLine, maybeRevsersedStations, selectedDirection, step]);
};
