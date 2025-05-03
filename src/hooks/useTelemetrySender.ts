import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ENABLE_EXPERIMENTAL_TELEMETRY } from 'react-native-dotenv';
import { useRecoilValue } from 'recoil';
import { z } from 'zod';
import stationState from '../store/atoms/station';
import useIsPassing from './useIsPassing';
import { useLocationStore } from './useLocationStore';

const MovingState = z.enum(['arrived', 'approaching', 'passing', 'moving']);
type MovingState = z.infer<typeof MovingState>;

const TelemetryPayload = z.object({
  coords: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().nullable(),
    speed: z.number(),
  }),
  device: z.string(),
  state: MovingState,
  timestamp: z.number(),
});
type TelemetryPayload = z.infer<typeof TelemetryPayload>;

export const useTelemetrySender = (wsUrl = 'ws://localhost:8080') => {
  const socketRef = useRef<WebSocket | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const latitude = useLocationStore((state) => state?.coords.latitude);
  const longitude = useLocationStore((state) => state?.coords.longitude);
  const accuracy = useLocationStore((state) => state?.coords.accuracy);
  const speed = useLocationStore((state) => state?.coords.speed);

  const { arrived: arrivedFromState, approaching: approachingFromState } =
    useRecoilValue(stationState);

  const passing = useIsPassing();

  const state = useMemo<MovingState>(() => {
    if (passing) {
      return 'passing';
    }
    if (arrivedFromState) {
      return 'arrived';
    }
    if (approachingFromState) {
      return 'approaching';
    }
    return 'moving';
  }, [arrivedFromState, approachingFromState, passing]);

  useEffect(() => {
    if (!__DEV__ || ENABLE_EXPERIMENTAL_TELEMETRY !== 'true') {
      return;
    }

    const checkPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionGranted(status === 'granted');
    };

    checkPermission();
  }, []);

  useEffect(() => {
    if (!__DEV__ || ENABLE_EXPERIMENTAL_TELEMETRY !== 'true') {
      return;
    }

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onerror = (e) => {
      console.warn('WebSocket error', e);
    };

    socket.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      socket.close();
    };
  }, [wsUrl]);

  useEffect(() => {
    const start = async () => {
      if (!permissionGranted) {
        return;
      }

      const payload = TelemetryPayload.safeParse({
        coords: {
          latitude: latitude ?? 0,
          longitude: longitude ?? 0,
          accuracy: accuracy ?? null,
          speed: speed ?? -1,
        },
        device: Device.modelName ?? 'unknown',
        state,
        timestamp: Date.now(),
      });

      if (socketRef.current?.readyState === WebSocket.OPEN && payload.success) {
        socketRef.current.send(
          JSON.stringify({
            type: 'location_update',
            ...payload.data,
          })
        );
      }
    };

    start();
  }, [accuracy, latitude, longitude, speed, permissionGranted, state]);
};
