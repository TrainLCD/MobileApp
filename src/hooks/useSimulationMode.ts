import * as Location from 'expo-location';
import getDistance from 'geolib/es/getDistance';
import getPathLength from 'geolib/es/getPathLength';
import type { GeolibInputCoordinates } from 'geolib/es/types';
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

  const segmentIndexRef = useRef(0);
  const childIndexRef = useRef(0);
  const speedProfilesRef = useRef<number[][]>([]);
  const segmentProgressDistanceRef = useRef(0);
  const dwellPendingRef = useRef(false);

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
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse(),
    [stations, selectedDirection]
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
    const speedProfiles = maybeRevsersedStations.map(
      (cur, curMapIndex, arr) => {
        const stationsWithoutPass = arr.filter((s) => !getIsPass(s));

        const curIdx = stationsWithoutPass.indexOf(cur);
        if (curIdx === -1) {
          // 通過駅は速度プロファイル生成対象外
          return [];
        }

        const next = stationsWithoutPass[curIdx + 1];
        if (!next) {
          return [];
        }

        const stationIndex = curMapIndex;
        const nextStationIndex = arr.indexOf(next);

        const betweenNextStation = arr.slice(
          stationIndex + 1,
          nextStationIndex
        );

        if (
          cur.latitude == null ||
          cur.longitude == null ||
          next.latitude == null ||
          next.longitude == null
        ) {
          return [];
        }

        const points: GeolibInputCoordinates[] = [
          {
            latitude: cur.latitude as number,
            longitude: cur.longitude as number,
          },
          ...betweenNextStation
            .filter((s) => s.latitude != null && s.longitude != null)
            .map((s) => ({
              latitude: s.latitude as number,
              longitude: s.longitude as number,
            })),
          {
            latitude: next.latitude as number,
            longitude: next.longitude as number,
          },
        ];

        const distanceForNextStation = getPathLength(points);

        const accel = isBus
          ? BUS_MAX_ACCEL_IN_M_S
          : LINE_TYPE_MAX_ACCEL_IN_M_S[currentLineType];
        const decel = isBus
          ? BUS_MAX_DECEL_IN_M_S
          : LINE_TYPE_MAX_DECEL_IN_M_S[currentLineType];

        const speedProfile = generateTrainSpeedProfile({
          distance: distanceForNextStation,
          maxSpeed,
          accel,
          decel,
          interval: 1,
        });

        const profileDistance = speedProfile.reduce((sum, v) => sum + v, 0);
        const distanceRatio = distanceForNextStation / profileDistance;
        const correctedProfile = speedProfile.map((v) => v * distanceRatio);

        return correctedProfile;
      }
    );

    segmentIndexRef.current = resolveStartIndex();
    speedProfilesRef.current = speedProfiles;
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

      // segmentIndexRefに基づいて目的地を決定（nextStationフックに依存しない）
      const stationsWithoutPass = maybeRevsersedStations.filter(
        (s) => !getIsPass(s)
      );
      if (stationsWithoutPass.length === 0) {
        return;
      }

      const currentSegmentStation =
        maybeRevsersedStations[normalizedSegmentIndex];
      if (!currentSegmentStation) {
        return;
      }
      const currentSegmentStationIndex = normalizedSegmentIndex;

      const currentSegmentStopIndex = stationsWithoutPass.indexOf(
        currentSegmentStation
      );
      const nextStopStation = stationsWithoutPass[currentSegmentStopIndex + 1];

      if (!nextStopStation) {
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

      if (
        nextStopStation.latitude == null ||
        nextStopStation.longitude == null
      ) {
        return;
      }

      const nextStopStationIndex =
        maybeRevsersedStations.indexOf(nextStopStation);
      if (
        nextStopStationIndex < 0 ||
        nextStopStationIndex < currentSegmentStationIndex
      ) {
        segmentIndexRef.current = 0;
        childIndexRef.current = 0;
        segmentProgressDistanceRef.current = 0;
        return;
      }

      const waypoints = maybeRevsersedStations
        .slice(currentSegmentStationIndex, nextStopStationIndex + 1)
        .filter((s) => s.latitude != null && s.longitude != null);

      if (waypoints.length === 0) {
        return;
      }

      const progressedDistance = segmentProgressDistanceRef.current + speed;
      const cumulativeDistances = waypoints.reduce<number[]>(
        (acc, waypoint, index, arr) => {
          if (index === 0) {
            acc.push(0);
            return acc;
          }

          const prevWaypoint = arr[index - 1];
          if (!prevWaypoint) {
            return acc;
          }

          const prevDistance = acc[index - 1] ?? 0;
          const distance = getDistance(
            {
              latitude: prevWaypoint.latitude as number,
              longitude: prevWaypoint.longitude as number,
            },
            {
              latitude: waypoint.latitude as number,
              longitude: waypoint.longitude as number,
            }
          );

          acc.push(prevDistance + distance);
          return acc;
        },
        []
      );

      const segmentDistance =
        cumulativeDistances[cumulativeDistances.length - 1];
      if (segmentDistance == null) {
        return;
      }

      const nextProgressDistance = Math.min(
        progressedDistance,
        segmentDistance
      );
      const moveDistance = Math.max(
        0,
        nextProgressDistance - segmentProgressDistanceRef.current
      );

      const targetWaypointIndex = cumulativeDistances.findIndex(
        (distance) => distance >= nextProgressDistance
      );
      if (targetWaypointIndex < 0) {
        return;
      }

      const targetWaypoint = waypoints[targetWaypointIndex];
      if (!targetWaypoint) {
        return;
      }

      let targetLatitude = targetWaypoint.latitude as number;
      let targetLongitude = targetWaypoint.longitude as number;

      if (targetWaypointIndex > 0) {
        const prevWaypoint = waypoints[targetWaypointIndex - 1];
        const prevDistance = cumulativeDistances[targetWaypointIndex - 1] ?? 0;
        const targetDistance = cumulativeDistances[targetWaypointIndex] ?? 0;
        const distanceDelta = targetDistance - prevDistance;

        if (
          prevWaypoint &&
          prevWaypoint.latitude != null &&
          prevWaypoint.longitude != null &&
          targetWaypoint.latitude != null &&
          targetWaypoint.longitude != null &&
          distanceDelta > 0
        ) {
          const ratio = (nextProgressDistance - prevDistance) / distanceDelta;
          targetLatitude =
            (prevWaypoint.latitude as number) +
            ((targetWaypoint.latitude as number) -
              (prevWaypoint.latitude as number)) *
              ratio;
          targetLongitude =
            (prevWaypoint.longitude as number) +
            ((targetWaypoint.longitude as number) -
              (prevWaypoint.longitude as number)) *
              ratio;
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
