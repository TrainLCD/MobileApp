import * as Location from 'expo-location';
import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { ENABLE_EXPERIMENTAL_TELEMETRY } from 'react-native-dotenv';
import { z } from 'zod';
import { isDevApp } from '../utils/isDevApp';
import { useLocationStore } from './useLocationStore';

const TelemetryPayload = z.object({
  coords: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().nullable(),
    speed: z.number(),
  }),
  accel: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  timestamp: z.number(),
});
type TelemetryPayload = z.infer<typeof TelemetryPayload>;

export const useTelemetrySender = (wsUrl = 'ws://localhost:8080') => {
  const socketRef = useRef<WebSocket | null>(null);

  const latitude = useLocationStore((state) => state?.coords.latitude);
  const longitude = useLocationStore((state) => state?.coords.longitude);
  const accuracy = useLocationStore((state) => state?.coords.accuracy);
  const speed = useLocationStore((state) => state?.coords.speed);

  useEffect(() => {
    if (
      !isDevApp ||
      !ENABLE_EXPERIMENTAL_TELEMETRY ||
      ENABLE_EXPERIMENTAL_TELEMETRY === 'false'
    ) {
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return;
      }

      const latestAccel = await new Promise<AccelerometerMeasurement>(
        (resolve) => {
          const sub = Accelerometer.addListener((data) => {
            resolve(data);
            sub.remove();
          });
        }
      );

      const payload = TelemetryPayload.safeParse({
        coords: {
          latitude: latitude ?? 0,
          longitude: longitude ?? 0,
          accuracy: accuracy ?? null,
          speed: speed ?? -1,
        },
        accel: latestAccel,
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
  }, [accuracy, latitude, longitude, speed]);
};
