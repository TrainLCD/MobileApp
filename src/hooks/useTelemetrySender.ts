import * as Device from 'expo-device';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRecoilValue } from 'recoil';
import { z } from 'zod';
import { isTelemetryEnabled } from '~/utils/telemetryConfig';
import stationState from '../store/atoms/station';
import useIsPassing from './useIsPassing';
import { useLocationStore } from './useLocationStore';
import { EXPERIMENTAL_TELEMETRY_ENDPOINT_URL } from 'react-native-dotenv';

const MovingState = z.enum(['arrived', 'approaching', 'passing', 'moving']);
type MovingState = z.infer<typeof MovingState>;

const TelemetryPayload = z.object({
  coords: z.object({
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    accuracy: z.number().nullable(),
    speed: z.number().nullable(),
  }),
  device: z.string(),
  state: MovingState,
  timestamp: z.number(),
});
type TelemetryPayload = z.infer<typeof TelemetryPayload>;

export const useTelemetrySender = (
  wsUrl = EXPERIMENTAL_TELEMETRY_ENDPOINT_URL
) => {
  const socketRef = useRef<WebSocket | null>(null);
  const lastSentRef = useRef<number>(0);
  const THROTTLE_MS = 1000; // 1秒間に1回までの送信に制限

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
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout: NodeJS.Timeout;

    if (!isTelemetryEnabled) {
      return;
    }

    const connectWebSocket = () => {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      socket.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
      };
      socket.onerror = (e) => {
        console.warn('WebSocket error', e);
      };
      socket.onclose = () => {
        console.log('WebSocket closed');
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
          reconnectTimeout = setTimeout(connectWebSocket, delay);
        }
      };

      return socket;
    };

    const socket = connectWebSocket();

    return () => {
      socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, [wsUrl]);

  const sendTelemetry = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < THROTTLE_MS) {
      return;
    }

    const payload = TelemetryPayload.safeParse({
      coords: {
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        accuracy: accuracy ?? null,
        speed: speed ?? null,
      },
      device: Device.modelName ?? 'unknown',
      state,
      timestamp: now,
    });

    if (
      socketRef.current?.readyState === WebSocket.OPEN &&
      payload.success &&
      payload.data.coords.latitude != null &&
      payload.data.coords.longitude != null
    ) {
      socketRef.current.send(
        JSON.stringify({
          type: 'location_update',
          ...payload.data,
        })
      );
    }
  }, [accuracy, latitude, longitude, speed, state]);

  useEffect(() => {
    if (!isTelemetryEnabled) {
      return;
    }

    sendTelemetry();
  }, [sendTelemetry]);
};
