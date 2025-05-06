import { getPathLength } from 'geolib';
import computeDestinationPoint from 'geolib/es/computeDestinationPoint';
import getRhumbLineBearing from 'geolib/es/getRhumbLineBearing';
import type { GeolibInputCoordinates } from 'geolib/es/types';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRecoilValue } from 'recoil';
import { isDevApp } from '~/utils/isDevApp';
import { generateTrainSpeedProfile } from '~/utils/trainSpeed';
import { LineType } from '../../gen/proto/stationapi_pb';
import {
  LINE_TYPE_MAX_ACCEL_IN_M_S,
  LINE_TYPE_MAX_DECEL_IN_M_S,
  LINE_TYPE_MAX_SPEEDS_IN_M_S,
  TRAIN_TYPE_KIND_MAX_SPEEDS_IN_M_S,
} from '../constants/simulationMode';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getIsPass from '../utils/isPass';
import { useCurrentLine } from './useCurrentLine';
import useCurrentTrainType from './useCurrentTrainType';
import { useInRadiusStation } from './useInRadiusStation';
import { useLocationStore } from './useLocationStore';
import { useNextStation } from './useNextStation';

export const useSimulationMode = (enabled: boolean): void => {
  const { stations: rawStations, selectedDirection } =
    useRecoilValue(stationState);
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

  const maxSpeed = useMemo<number>(() => {
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
  }, [currentLineType, trainType]);

  const station = useInRadiusStation(maxSpeed / 2);
  const nextStation = useNextStation(false, station ?? undefined);

  const maybeRevsersedStations = useMemo(
    () =>
      selectedDirection === 'INBOUND' ? stations : stations.slice().reverse(),
    [stations, selectedDirection]
  );

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

      const points: GeolibInputCoordinates[] = [
        { latitude: cur.latitude, longitude: cur.longitude },
        ...betweenNextStation.map((s) => ({
          latitude: s.latitude,
          longitude: s.longitude,
        })),
        {
          latitude: next.latitude,
          longitude: next.longitude,
        },
      ];

      const distanceForNextStation = getPathLength(points);

      const speedProfile = generateTrainSpeedProfile({
        distance: distanceForNextStation,
        maxSpeed,
        accel: LINE_TYPE_MAX_ACCEL_IN_M_S[currentLineType],
        decel: LINE_TYPE_MAX_DECEL_IN_M_S[currentLineType],
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
        useLocationStore.setState((prev) =>
          prev
            ? {
                ...prev,
                coords: {
                  ...prev.coords,
                  latitude: maybeRevsersedStations[0]?.latitude,
                  longitude: maybeRevsersedStations[0]?.longitude,
                },
                timestamp: new Date().getTime(),
              }
            : prev
        );
        return;
      }

      useLocationStore.setState((prev) => {
        if (!prev) {
          return prev;
        }

        const bearingForNextStation = getRhumbLineBearing(
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

        return {
          timestamp: new Date().getTime(),
          coords: {
            ...nextPoint,
            accuracy: 0,
            altitude: null,
            altitudeAccuracy: null,
            speed,
            heading: null,
          },
        };
      });
    },
    [nextStation, maybeRevsersedStations]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (enabled && isDevApp && stations.length > 0 && station) {
      useLocationStore.setState({
        timestamp: new Date().getTime(),
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
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isDevApp || !selectedDirection) {
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
