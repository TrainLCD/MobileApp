import { Effect, pipe } from 'effect';
import * as Location from 'expo-location';
import getCenter from 'geolib/es/getCenter';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import navigationState from '~/store/atoms/navigation';
import {
  AUTO_MODE_RUNNING_DURATION,
  AUTO_MODE_WHOLE_DURATION,
  LOCATION_TASK_NAME,
} from '../constants';
import { AUTO_MODE_RUNNING_SPEED } from '../constants/threshold';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import { useLocationStore } from './useLocationStore';
import { useLoopLine } from './useLoopLine';
import { useValueRef } from './useValueRef';

export const useAutoMode = (): void => {
  const {
    station,
    stations: rawStations,
    selectedDirection,
  } = useAtomValue(stationState);
  const { selectedLine } = useAtomValue(lineState);
  const { enableLegacyAutoMode, autoModeEnabled } =
    useAtomValue(navigationState);

  const stations = useMemo(
    () => dropEitherJunctionStation(rawStations, selectedDirection),
    [rawStations, selectedDirection]
  );

  const [autoModeInboundIndex, setAutoModeInboundIndex] = useState(
    stations.findIndex((s) => s.groupId === station?.groupId)
  );
  const [autoModeOutboundIndex, setAutoModeOutboundIndex] = useState(
    stations.findIndex((s) => s.groupId === station?.groupId)
  );
  const autoModeInboundIndexRef = useValueRef(autoModeInboundIndex);
  const autoModeOutboundIndexRef = useValueRef(autoModeOutboundIndex);
  const autoModeApproachingTimerRef = useRef<number>(null);
  const autoModeArriveTimerRef = useRef<number>(null);

  const { isLoopLine } = useLoopLine();

  const enabled = useMemo(() => {
    return enableLegacyAutoMode && autoModeEnabled;
  }, [enableLegacyAutoMode, autoModeEnabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    pipe(
      Effect.promise(() =>
        Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
      ),
      Effect.andThen((hasStarted) => {
        if (hasStarted) {
          return Effect.promise(() =>
            Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
          );
        }
      }),
      Effect.runPromise
    );
  }, [enabled]);

  const startApproachingTimer = useCallback(() => {
    if (
      !enabled ||
      autoModeApproachingTimerRef.current ||
      !selectedDirection ||
      !selectedLine
    ) {
      return;
    }

    const intervalInternal = () => {
      if (selectedDirection === 'INBOUND') {
        const index = autoModeInboundIndexRef.current;

        if (!index) {
          useLocationStore.setState({
            timestamp: 0,
            coords: {
              accuracy: 0,
              altitude: 0,
              altitudeAccuracy: -1,
              speed: 0,
              heading: 0,
              latitude: stations[0].latitude,
              longitude: stations[0].longitude,
            },
          });
          return;
        }

        const cur = stations[index];
        const next = isLoopLine ? stations[index - 1] : stations[index + 1];

        if (cur && next) {
          const center = getCenter([
            {
              latitude: cur.latitude,
              longitude: cur.longitude,
            },
            {
              latitude: next.latitude,
              longitude: next.longitude,
            },
          ]);

          if (center) {
            useLocationStore.setState({
              timestamp: 0,
              coords: {
                ...center,
                accuracy: 0,
                altitude: 0,
                altitudeAccuracy: -1,
                speed: AUTO_MODE_RUNNING_SPEED,
                heading: 0,
              },
            });
          }
        }
      } else {
        const index = autoModeOutboundIndexRef.current;

        if (index === stations.length - 1) {
          useLocationStore.setState({
            timestamp: 0,
            coords: {
              accuracy: 0,
              altitude: 0,
              altitudeAccuracy: -1,
              speed: 0,
              heading: 0,
              latitude: stations[stations.length - 1].latitude,
              longitude: stations[stations.length - 1].longitude,
            },
          });
          return;
        }

        const cur = stations[index];
        const next = isLoopLine ? stations[index + 1] : stations[index - 1];

        if (cur && next) {
          const center = getCenter([
            {
              latitude: cur.latitude,
              longitude: cur.longitude,
            },
            {
              latitude: next.latitude,
              longitude: next.longitude,
            },
          ]);

          if (center) {
            useLocationStore.setState({
              timestamp: 0,
              coords: {
                ...center,
                accuracy: 0,
                altitude: 0,
                altitudeAccuracy: -1,
                speed: AUTO_MODE_RUNNING_SPEED,
                heading: 0,
              },
            });
          }
        }
      }
    };

    intervalInternal();

    const interval = setInterval(intervalInternal, AUTO_MODE_RUNNING_DURATION);

    autoModeApproachingTimerRef.current = interval;
  }, [
    autoModeInboundIndexRef,
    autoModeOutboundIndexRef,
    enabled,
    isLoopLine,
    selectedDirection,
    selectedLine,
    stations,
  ]);

  useEffect(() => {
    startApproachingTimer();
  }, [startApproachingTimer]);

  const startArriveTimer = useCallback(() => {
    const direction = selectedDirection;

    if (
      !enabled ||
      autoModeArriveTimerRef.current ||
      !direction ||
      !selectedLine
    ) {
      return;
    }

    const intervalInternal = () => {
      if (direction === 'INBOUND') {
        const index = autoModeInboundIndexRef.current;

        const next = stations[index];

        if (!isLoopLine && index === stations.length - 1) {
          setAutoModeInboundIndex(0);
        } else {
          setAutoModeInboundIndex((prev) => (isLoopLine ? prev - 1 : prev + 1));
        }

        if (!index && isLoopLine) {
          setAutoModeInboundIndex(stations.length - 1);
        }

        if (next) {
          useLocationStore.setState({
            timestamp: 0,
            coords: {
              latitude: next.latitude,
              longitude: next.longitude,
              accuracy: 0,
              altitude: 0,
              altitudeAccuracy: -1,
              speed: 0,
              heading: 0,
            },
          });
        }
      } else if (direction === 'OUTBOUND') {
        const index = autoModeOutboundIndexRef.current;

        const next = stations[index];
        if (!isLoopLine && !index) {
          setAutoModeOutboundIndex(stations.length);
        } else {
          setAutoModeOutboundIndex((prev) =>
            isLoopLine ? prev + 1 : prev - 1
          );
        }

        if (index === stations.length - 1 && isLoopLine) {
          setAutoModeOutboundIndex(0);
        }

        if (next) {
          useLocationStore.setState({
            timestamp: 0,
            coords: {
              latitude: next.latitude,
              longitude: next.longitude,
              accuracy: 0,
              altitude: 0,
              altitudeAccuracy: -1,
              speed: 0,
              heading: 0,
            },
          });
        }
      }
    };

    intervalInternal();

    const interval = setInterval(intervalInternal, AUTO_MODE_WHOLE_DURATION);
    autoModeArriveTimerRef.current = interval;
  }, [
    autoModeInboundIndexRef,
    autoModeOutboundIndexRef,
    enabled,
    isLoopLine,
    selectedDirection,
    selectedLine,
    stations,
  ]);

  useEffect(() => {
    startArriveTimer();
  }, [startArriveTimer]);

  useEffect(() => {
    return () => {
      if (autoModeApproachingTimerRef.current) {
        clearInterval(autoModeApproachingTimerRef.current);
      }
      if (autoModeArriveTimerRef.current) {
        clearInterval(autoModeArriveTimerRef.current);
      }
    };
  }, []);
};
