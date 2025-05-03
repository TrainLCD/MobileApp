import { getPathLength } from 'geolib';
import computeDestinationPoint from 'geolib/es/computeDestinationPoint';
import getRhumbLineBearing from 'geolib/es/getRhumbLineBearing';
import type { GeolibInputCoordinates } from 'geolib/es/types';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRecoilValue } from 'recoil';
import { generateTrainSpeedProfile } from '~/utils/trainSpeed';
import { LineType } from '../../gen/proto/stationapi_pb';
import {
  LINE_TYPE_MAX_ACCEL_IN_M_S,
  LINE_TYPE_MAX_DECEL_IN_M_S,
  LINE_TYPE_MAX_SPEEDS_IN_M_S,
} from '../constants/simulationMode';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getIsPass from '../utils/isPass';
import { useCurrentLine } from './useCurrentLine';
import { useLocationStore } from './useLocationStore';
import { useNextStation } from './useNextStation';

export const useSimulationMode = (enabled: boolean): void => {
  const {
    stations: rawStations,
    selectedDirection,
    station,
  } = useRecoilValue(stationState);
  const currentLine = useCurrentLine();

  const indexRef = useRef(0);
  const speedProfilesRef = useRef<number[][]>([]);

  const nextStation = useNextStation(false);

  const stations = useMemo(
    () => dropEitherJunctionStation(rawStations, selectedDirection),
    [rawStations, selectedDirection]
  );

  const currentLineType = useMemo(
    () => currentLine?.lineType ?? LineType.Normal,
    [currentLine]
  );

  useEffect(() => {
    speedProfilesRef.current = stations.map((cur) => {
      const stationsWithoutPass = stations.filter((s) => !getIsPass(s));

      const next =
        selectedDirection === 'INBOUND'
          ? stationsWithoutPass[stationsWithoutPass.indexOf(cur) + 1]
          : stationsWithoutPass[stationsWithoutPass.indexOf(cur) - 1];

      if (!next) {
        return [];
      }

      const stationIndex = stations.findIndex(
        (s) => s.groupId === cur?.groupId
      );
      const nextStationIndex = stations.findIndex(
        (s) => s.groupId === next?.groupId
      );

      const betweenNextStation = stations.slice(
        stationIndex + 1,
        nextStationIndex
      );
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

      return generateTrainSpeedProfile({
        distance: distanceForNextStation,
        maxSpeed: LINE_TYPE_MAX_SPEEDS_IN_M_S[currentLineType],
        accel: LINE_TYPE_MAX_ACCEL_IN_M_S[currentLineType],
        decel: LINE_TYPE_MAX_DECEL_IN_M_S[currentLineType],
        interval: 1,
      });
    });
  }, [currentLineType, stations, selectedDirection]);

  const step = useCallback(
    (speed: number) => {
      if (!station || !nextStation) {
        return;
      }

      const bearingForNextStation = getRhumbLineBearing(
        {
          latitude: station.latitude,
          longitude: station.longitude,
        },
        {
          latitude: nextStation.latitude,
          longitude: nextStation.longitude,
        }
      );

      useLocationStore.setState((prev) => {
        if (!prev) {
          return prev;
        }

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
    [station, nextStation]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (enabled && station) {
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
    if (!enabled || !selectedDirection) {
      return;
    }

    const intervalId = setInterval(() => {
      const speeds =
        speedProfilesRef.current[
          stations.findIndex((s) => s.groupId === station?.groupId)
        ] ?? [];

      const i = indexRef.current;
      if (i >= speeds.length) {
        indexRef.current = 0;
        return;
      }

      const speed = speeds[i];
      step(speed);
      indexRef.current += 1;
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, selectedDirection, station, stations, step]);
};
