import * as Location from 'expo-location';
import computeDestinationPoint from 'geolib/es/computeDestinationPoint';
import getGreatCircleBearing from 'geolib/es/getGreatCircleBearing';
import getPathLength from 'geolib/es/getPathLength';
import type { GeolibInputCoordinates } from 'geolib/es/types';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { LineType, TransportType } from '~/@types/graphql';
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
import { locationAtom, setLocation } from '~/store/atoms/location';
import navigationState from '~/store/atoms/navigation';
import { generateTrainSpeedProfile } from '~/utils/trainSpeed';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getIsPass from '../utils/isPass';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useInRadiusStation } from './useInRadiusStation';
import { useNextStation } from './useNextStation';

export const useSimulationMode = (): void => {
  const { stations: rawStations, selectedDirection } =
    useAtomValue(stationState);
  const { enableLegacyAutoMode, autoModeEnabled } =
    useAtomValue(navigationState);

  const currentLine = useCurrentLine();
  const trainType = useCurrentTrainType();

  const segmentIndexRef = useRef(0);
  const childIndexRef = useRef(0);
  const speedProfilesRef = useRef<number[][]>([]);

  const stations = useMemo(
    () => dropEitherJunctionStation(rawStations, selectedDirection),
    [rawStations, selectedDirection]
  );

  const currentLineType = useMemo(
    () => currentLine?.lineType ?? LineType.Normal,
    [currentLine]
  );

  const isBus = useMemo(
    () => currentLine?.transportType === TransportType.Bus,
    [currentLine]
  );

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

  const station = useInRadiusStation(maxSpeed / 2);
  const nextStation = useNextStation(false);

  const maybeRevsersedStations = useMemo(
    () =>
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse(),
    [stations, selectedDirection]
  );

  const enabled = useMemo(() => {
    return !enableLegacyAutoMode && autoModeEnabled;
  }, [enableLegacyAutoMode, autoModeEnabled]);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: プロファイル生成は初回のみ
  useEffect(() => {
    const speedProfiles = maybeRevsersedStations.map((cur, _, arr) => {
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

      const stationIndex = arr.findIndex((s) => s.id === cur.id);
      const nextStationIndex = arr.findIndex((s) => s.id === next.id);

      const betweenNextStation = arr.slice(stationIndex + 1, nextStationIndex);

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
    });

    segmentIndexRef.current = maybeRevsersedStations.findIndex(
      (s) => s.groupId === station?.groupId
    );
    speedProfilesRef.current = speedProfiles;
    childIndexRef.current = 0;
  }, []);

  const step = useCallback(
    (speed: number) => {
      if (!nextStation) {
        segmentIndexRef.current = 0;
        const firstStation = maybeRevsersedStations[0];
        const prev = store.get(locationAtom);
        if (
          prev &&
          firstStation?.latitude != null &&
          firstStation?.longitude != null
        ) {
          setLocation({
            ...prev,
            coords: {
              ...prev.coords,
              latitude: firstStation.latitude,
              longitude: firstStation.longitude,
            },
            timestamp: Date.now(),
          });
        }
        return;
      }

      const prev = store.get(locationAtom);
      if (
        !prev ||
        nextStation.latitude == null ||
        nextStation.longitude == null
      ) {
        return;
      }

      const bearingForNextStation = getGreatCircleBearing(
        {
          latitude: prev.coords.latitude,
          longitude: prev.coords.longitude,
        },
        {
          latitude: nextStation.latitude,
          longitude: nextStation.longitude,
        }
      );

      const nextPoint = computeDestinationPoint(
        {
          lat: prev.coords.latitude,
          lon: prev.coords.longitude,
        },
        speed,
        bearingForNextStation
      );

      setLocation({
        timestamp: Date.now(),
        coords: {
          ...nextPoint,
          accuracy: 0,
          altitude: null,
          altitudeAccuracy: null,
          speed,
          heading: null,
        },
      });
    },
    [nextStation, maybeRevsersedStations]
  );

  useEffect(() => {
    if (
      enabled &&
      stations.length > 0 &&
      station &&
      station.latitude != null &&
      station.longitude != null
    ) {
      setLocation({
        timestamp: Date.now(),
        coords: {
          accuracy: null,
          altitude: null,
          altitudeAccuracy: null,
          speed: null,
          heading: null,
          latitude: station.latitude,
          longitude: station.longitude,
        },
      });
    }
  }, [enabled, station, stations.length]);

  useEffect(() => {
    if (!enabled || !selectedDirection) {
      return;
    }

    const intervalId = setInterval(() => {
      const i = childIndexRef.current;

      const speeds = speedProfilesRef.current[segmentIndexRef.current] ?? [];

      if (i >= speeds.length) {
        const nextSegmentIndex = speedProfilesRef.current.findIndex(
          (seg, idx) => seg.length > 0 && idx > segmentIndexRef.current
        );

        segmentIndexRef.current = nextSegmentIndex;
        childIndexRef.current = 0;
        return;
      }

      const speed = speeds[i];

      step(speed);
      childIndexRef.current += 1;
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, selectedDirection, step]);
};
