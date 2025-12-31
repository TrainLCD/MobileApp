import * as Device from 'expo-device';
import { NetworkStateType, useNetworkState } from 'expo-network';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  EXPERIMENTAL_TELEMETRY_ENDPOINT_URL,
  EXPERIMENTAL_TELEMETRY_TOKEN,
} from 'react-native-dotenv';
import { z } from 'zod';
import { webSocketUrlRegexp } from '~/constants/regexp';
import {
  TELEMETRY_MAX_QUEUE_SIZE,
  TELEMETRY_THROTTLE_MS,
} from '~/constants/telemetry';
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

const TelemetryPayload = z.object({
  type: z.enum(['location_update', 'log', 'error']),
  coords: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().nullable().optional(),
      speed: z.number().nullable().optional(),
    })
    .optional(),
  error: z
    .object({
      type: z.enum([
        'websocket_message_error',
        'json_parse_error',
        'payload_parse_error',
        'accuracy_low',
        'invalid_coords',
        'unknown',
      ]),
      reason: z.string(),
    })
    .optional(),
  log: z
    .object({
      type: z.literal('app'),
      level: z.enum(['debug', 'info', 'warn', 'error']),
      message: z.string(),
    })
    .optional(),
  device: z.string(),
  timestamp: z.number(),
  lineId: z.number(),
  stationId: z.number().nullable().optional(),
  state: MovingState.optional(),
});

export const useTelemetrySender = (
  sendTelemetryAutomatically = false,
  wsUrl = EXPERIMENTAL_TELEMETRY_ENDPOINT_URL
) => {
  const socketRef = useRef<WebSocket | null>(null);
  const lastSentTelemetryRef = useRef<number>(0);
  const gnssRef = useRef<GnssState | null>(null);
  const telemetryQueueRef = useRef<string[]>([]);
  const messageQueueRef = useRef<string[]>([]);
  const protocols = useMemo(
    () => ['thq', `thq-auth-${EXPERIMENTAL_TELEMETRY_TOKEN}`],
    []
  );
  const station = useCurrentStation();
  const line = useCurrentLine();

  useEffect(
    () =>
      subscribeGnss((gnss) => {
        gnssRef.current = gnss;
      }),
    []
  );

  // キューにメッセージを追加し、サイズ超過時は古いものを削除
  const enqueueMessage = useCallback((queue: string[], message: string) => {
    queue.push(message);
    if (queue.length > TELEMETRY_MAX_QUEUE_SIZE) {
      queue.shift();
    }
  }, []);

  const coords = useAtomValue(locationAtom)?.coords;

  const { arrived: arrivedFromState, approaching: approachingFromState } =
    useAtomValue(stationState);
  const isTelemetryEnabled = useTelemetryEnabled();

  const passing = useIsPassing();

  const { type: networkType } = useNetworkState();
  const isWifiConnected = useMemo(
    () => networkType === NetworkStateType.WIFI,
    [networkType]
  );

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
    (message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'debug') => {
      if (!line?.id) {
        return;
      }

      const now = Date.now();

      const payload = TelemetryPayload.safeParse({
        type: 'log',
        log: {
          type: 'app',
          level,
          message,
        },
        device: Device.modelName ?? 'unknown',
        lineId: line.id,
        timestamp: now,
      });

      if (payload.error) {
        console.error('Invalid telemetry payload:', payload.error);
        return;
      }

      const stringifiedMessage = JSON.stringify({
        ...payload.data,
      });

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(stringifiedMessage);
      } else {
        enqueueMessage(messageQueueRef.current, stringifiedMessage);
      }
    },
    [enqueueMessage, line?.id]
  );

  const sendTelemetry = useCallback(() => {
    if (!line?.id) {
      return;
    }

    const now = Date.now();
    if (now - lastSentTelemetryRef.current < TELEMETRY_THROTTLE_MS) {
      return;
    }

    const payload = TelemetryPayload.safeParse({
      type: 'location_update',
      coords,
      device: Device.modelName ?? 'unknown',
      state,
      gnss: gnssRef.current ?? null,
      radio: {
        isWifiConnected,
      },
      lineId: line.id,
      stationId: station?.id,
      timestamp: now,
    });

    if (payload.error) {
      console.error('Invalid telemetry payload:', payload.error);
      return;
    }

    const stringifiedData = JSON.stringify({
      ...payload.data,
    });

    const isPayloadValid =
      payload.data.coords?.latitude != null &&
      payload.data.coords?.longitude != null;

    if (isPayloadValid) {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(stringifiedData);
        lastSentTelemetryRef.current = now;
      } else {
        enqueueMessage(telemetryQueueRef.current, stringifiedData);
      }
    }
  }, [coords, state, enqueueMessage, isWifiConnected, line?.id, station?.id]);

  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout: number;
    let shouldReconnect = true;

    if (!isTelemetryEnabled || !line?.id) {
      return;
    }

    const connectWebSocket = () => {
      if (!wsUrl || !webSocketUrlRegexp.test(wsUrl)) {
        console.warn('Invalid WebSocket URL');
        return;
      }

      try {
        const socket = new WebSocket(wsUrl, protocols);
        socketRef.current = socket;
        socket.onopen = () => {
          console.log('WebSocket connected');
          reconnectAttempts = 0;

          if (sendTelemetryAutomatically) {
            const logPayload = {
              type: 'log' as const,
              log: {
                type: 'app' as const,
                level: 'info' as const,
                message: 'Connected to the telemetry server as a app.',
              },
              device: Device.modelName ?? 'unknown',
              lineId: line.id,
              timestamp: Date.now(),
            };
            socket.send(JSON.stringify(logPayload));
          }

          // キューの内容を送信（refを使ってアクセス）
          const msgQueue = messageQueueRef.current;
          const telQueue = telemetryQueueRef.current;

          while (msgQueue.length > 0) {
            const msg = msgQueue.shift();
            if (msg) socket.send(msg);
          }
          while (telQueue.length > 0) {
            const msg = telQueue.shift();
            if (msg) socket.send(msg);
          }
        };
        socket.onerror = (e) => {
          console.warn('WebSocket error', e);
        };
        socket.onclose = () => {
          console.log('WebSocket closed');
          const logPayload = {
            type: 'log' as const,
            log: {
              type: 'app' as const,
              level: 'info' as const,
              message: 'Disconnected from the telemetry server as a app.',
            },
            device: Device.modelName ?? 'unknown',
            lineId: line.id,
            timestamp: Date.now(),
          };
          // キューへの追加もrefを使って実行
          const msgQueue = messageQueueRef.current;
          msgQueue.push(JSON.stringify(logPayload));
          if (msgQueue.length > TELEMETRY_MAX_QUEUE_SIZE) {
            msgQueue.shift();
          }

          if (shouldReconnect && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
            reconnectTimeout = setTimeout(connectWebSocket, delay);
          }
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
      }
    };

    connectWebSocket();

    return () => {
      shouldReconnect = false;
      socketRef.current?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [
    wsUrl,
    sendTelemetryAutomatically,
    protocols,
    isTelemetryEnabled,
    line?.id,
  ]);

  useEffect(() => {
    if (!isTelemetryEnabled || !sendTelemetryAutomatically) {
      return;
    }

    sendTelemetry();
  }, [sendTelemetry, sendTelemetryAutomatically, isTelemetryEnabled]);

  return { sendLog };
};
