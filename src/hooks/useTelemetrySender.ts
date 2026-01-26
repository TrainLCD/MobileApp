import * as Device from 'expo-device';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  EXPERIMENTAL_TELEMETRY_ENDPOINT_URL,
  EXPERIMENTAL_TELEMETRY_TOKEN,
} from 'react-native-dotenv';
import { z } from 'zod';
import { TELEMETRY_THROTTLE_MS } from '~/constants/telemetry';
import { locationAtom } from '~/store/atoms/location';
import {
  type GnssState,
  subscribeGnss,
} from '~/utils/native/android/gnssModule';
import stationState from '../store/atoms/station';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useIsPassing } from './useIsPassing';
import { useTelemetryEnabled } from './useTelemetryEnabled';

const MovingState = z.enum(['arrived', 'approaching', 'passing', 'moving']);
type MovingState = z.infer<typeof MovingState>;

const LocationUpdateRequest = z.object({
  device: z.string(),
  state: MovingState,
  stationId: z.number().nullable().optional(),
  lineId: z.number(),
  coords: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().nullable().optional(),
    speed: z.number().nullable().optional(),
  }),
  timestamp: z.number(),
});

const LogRequest = z.object({
  device: z.string(),
  timestamp: z.number(),
  log: z.object({
    type: z.enum(['system', 'app', 'client']),
    level: z.enum(['debug', 'info', 'warn', 'error']),
    message: z.string().min(1),
  }),
});

const ApiResponse = z.object({
  ok: z.boolean(),
  id: z.string().optional(),
  warning: z.string().optional(),
  error: z.string().optional(),
});

export const useTelemetrySender = (
  sendTelemetryAutomatically = false,
  baseUrl = EXPERIMENTAL_TELEMETRY_ENDPOINT_URL
) => {
  const lastSentTelemetryRef = useRef<number>(0);
  const gnssRef = useRef<GnssState | null>(null);

  const station = useCurrentStation();
  const line = useCurrentLine();

  useEffect(
    () =>
      subscribeGnss((gnss) => {
        gnssRef.current = gnss;
      }),
    []
  );

  const coords = useAtomValue(locationAtom)?.coords;

  const stationStateValue = useAtomValue(stationState);
  const { arrived: arrivedFromState, approaching: approachingFromState } =
    stationStateValue ?? { arrived: false, approaching: false };
  const isTelemetryEnabled = useTelemetryEnabled();

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

  const sendLog = useCallback(
    async (
      message: string,
      level: 'debug' | 'info' | 'warn' | 'error' = 'debug'
    ) => {
      if (!isTelemetryEnabled || !baseUrl) {
        return;
      }

      const now = Date.now();

      const payload = LogRequest.safeParse({
        device: Device.modelName ?? 'unknown',
        timestamp: now,
        log: {
          type: 'app',
          level,
          message,
        },
      });

      if (payload.error) {
        console.error('Invalid log payload:', payload.error);
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${EXPERIMENTAL_TELEMETRY_TOKEN}`,
          },
          body: JSON.stringify(payload.data),
        });

        const result = ApiResponse.safeParse(await response.json());
        if (result.success && !result.data.ok) {
          console.warn('Log API error:', result.data.error);
        }
      } catch (error) {
        console.error('Failed to send log:', error);
      }
    },
    [isTelemetryEnabled, baseUrl]
  );

  const sendTelemetry = useCallback(async () => {
    if (!isTelemetryEnabled || line?.id == null || !baseUrl) {
      return;
    }

    const now = Date.now();
    if (now - lastSentTelemetryRef.current < TELEMETRY_THROTTLE_MS) {
      return;
    }

    if (coords?.latitude == null || coords?.longitude == null) {
      return;
    }

    const payload = LocationUpdateRequest.safeParse({
      device: Device.modelName ?? 'unknown',
      state,
      lineId: line.id,
      stationId: station?.id ?? null,
      coords: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        speed: coords.speed,
      },
      timestamp: now,
    });

    if (payload.error) {
      console.error('Invalid location payload:', payload.error);
      return;
    }

    lastSentTelemetryRef.current = now;

    try {
      const response = await fetch(`${baseUrl}/api/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${EXPERIMENTAL_TELEMETRY_TOKEN}`,
        },
        body: JSON.stringify(payload.data),
      });

      const result = ApiResponse.safeParse(await response.json());
      if (result.success) {
        if (result.data.ok) {
          if (result.data.warning) {
            console.warn('Location API warning:', result.data.warning);
          }
        } else {
          console.warn('Location API error:', result.data.error);
        }
      }
    } catch (error) {
      console.error('Failed to send location:', error);
    }
  }, [coords, state, isTelemetryEnabled, line?.id, station?.id, baseUrl]);

  useEffect(() => {
    if (!isTelemetryEnabled || !sendTelemetryAutomatically) {
      return;
    }

    sendTelemetry();
  }, [sendTelemetry, sendTelemetryAutomatically, isTelemetryEnabled]);

  return { sendLog };
};
