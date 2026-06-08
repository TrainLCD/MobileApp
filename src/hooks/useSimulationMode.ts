import * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { LineType } from '~/@types/graphql';
import {
  BUS_MAX_ACCEL_IN_M_S,
  BUS_MAX_DECEL_IN_M_S,
  BUS_MAX_SPEED_IN_M_S,
  LINE_TYPE_MAX_ACCEL_IN_M_S,
  LINE_TYPE_MAX_DECEL_IN_M_S,
  LINE_TYPE_MAX_SPEEDS_IN_M_S,
  LOCATION_TASK_NAME,
  TRAIN_TYPE_KIND_MAX_SPEEDS_IN_M_S,
} from '~/constants';
import { store } from '~/store';
import { locationAtom } from '~/store/atoms/location';
import navigationState from '~/store/atoms/navigation';
import { generateTrainSpeedProfile } from '~/utils/trainSpeed';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getIsPass from '../utils/isPass';
import { isBusLine } from '../utils/line';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useLoopLine } from './useLoopLine';

export const useSimulationMode = (): void => {
  const {
    station: currentStation,
    stations: rawStations,
    selectedDirection,
  } = useAtomValue(stationState);
  const { autoModeEnabled } = useAtomValue(navigationState);

  const currentStationRef = useRef(currentStation);
  currentStationRef.current = currentStation;

  const currentLine = useCurrentLine();
  const trainType = useCurrentTrainType();
  const { isLoopLine } = useLoopLine();

  const segmentIndexRef = useRef(0);
  const childIndexRef = useRef(0);
  const speedProfilesRef = useRef<number[][]>([]);
  const segmentProgressDistanceRef = useRef(0);
  const dwellPendingRef = useRef(false);
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

  const currentLineType = useMemo(
    () => currentLine?.lineType ?? LineType.Normal,
    [currentLine]
  );

  const isBus = useMemo(() => isBusLine(currentLine), [currentLine]);

  const maxSpeed = useMemo<number>(() => {
    if (isBus) {
      return BUS_MAX_SPEED_IN_M_S;
    }

    if (currentLineType === LineType.BulletTrain) {
      return LINE_TYPE_MAX_SPEEDS_IN_M_S[LineType.BulletTrain];
    }

    const defaultMaxSpeed = LINE_TYPE_MAX_SPEEDS_IN_M_S[currentLineType];

    if (trainType?.kind && TRAIN_TYPE_KIND_MAX_SPEEDS_IN_M_S[trainType?.kind]) {
      return (
        TRAIN_TYPE_KIND_MAX_SPEEDS_IN_M_S[trainType.kind] ?? defaultMaxSpeed
      );
    }

    return defaultMaxSpeed;
  }, [isBus, currentLineType, trainType]);

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

  useEffect(() => {
    const speedProfiles: number[][] = new Array(maybeRevsersedStations.length);
    const segmentGeometry: SegmentGeometry[] = new Array(
      maybeRevsersedStations.length
    );

    const accel = isBus
      ? BUS_MAX_ACCEL_IN_M_S
      : LINE_TYPE_MAX_ACCEL_IN_M_S[currentLineType];
    const decel = isBus
      ? BUS_MAX_DECEL_IN_M_S
      : LINE_TYPE_MAX_DECEL_IN_M_S[currentLineType];
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
      if (
        !next ||
        cur.latitude == null ||
        cur.longitude == null ||
        next.latitude == null ||
        next.longitude == null
      ) {
        speedProfiles[curMapIndex] = [];
        segmentGeometry[curMapIndex] = emptyGeometry;
        continue;
      }

      // step() で参照する waypoints と累積距離を一度だけ計算してキャッシュする。
      // step() は毎秒呼ばれるため、ここで先払いすればその分のCPU負荷が減る。
      const waypoints: { latitude: number; longitude: number }[] = [
        {
          latitude: cur.latitude as number,
          longitude: cur.longitude as number,
        },
      ];
      for (let idx = curMapIndex + 1; idx < nextStationIndex; idx++) {
        const wp = maybeRevsersedStations[idx];
        if (!wp || wp.latitude == null || wp.longitude == null) {
          continue;
        }
        waypoints.push({
          latitude: wp.latitude as number,
          longitude: wp.longitude as number,
        });
      }
      waypoints.push({
        latitude: next.latitude as number,
        longitude: next.longitude as number,
      });

      const cumulative = new Array<number>(waypoints.length);
      cumulative[0] = 0;
      for (let i = 1; i < waypoints.length; i++) {
        const prev = waypoints[i - 1];
        const cur = waypoints[i];
        const d = getDistance(
          { latitude: prev.latitude, longitude: prev.longitude },
          { latitude: cur.latitude, longitude: cur.longitude }
        );
        cumulative[i] = (cumulative[i - 1] ?? 0) + d;
      }
      const distanceForNextStation = cumulative[cumulative.length - 1] ?? 0;

      segmentGeometry[curMapIndex] = {
        waypoints,
        cumulativeDistances: cumulative,
        totalDistance: distanceForNextStation,
      };

      const speedProfile = generateTrainSpeedProfile({
        distance: distanceForNextStation,
        maxSpeed,
        accel,
        decel,
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
  }, [
    maybeRevsersedStations,
    isBus,
    currentLineType,
    maxSpeed,
    resolveStartIndex,
  ]);

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
        }
        segmentIndexRef.current =
          nextSegmentIndex === -1 ? 0 : nextSegmentIndex;
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
  }, [enabled, maybeRevsersedStations, selectedDirection, step]);
};
