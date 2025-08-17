import * as Device from 'expo-device';
import { NetworkStateType, useNetworkState } from 'expo-network';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { EXPERIMENTAL_TELEMETRY_ENDPOINT_URL } from 'react-native-dotenv';
import { z } from 'zod';
import { webSocketUrlRegexp } from '~/constants/regexp';
import {
  TELEMETRY_MAX_QUEUE_SIZE,
  TELEMETRY_THROTTLE_MS,
} from '~/constants/telemetry';
import {
  type GnssState,
  subscribeGnss,
} from '~/utils/native/android/gnssModule';
import { isTelemetryEnabled } from '~/utils/telemetryConfig';
import stationState from '../store/atoms/station';
import { useIsPassing } from './useIsPassing';
import { useLocationStore } from './useLocationStore';

const MovingState = z.enum(['arrived', 'approaching', 'passing', 'moving']);
type MovingState = z.infer<typeof MovingState>;

const TelemetryPayload = z.object({
  schemaVersion: z.literal(2),
  type: z.enum(['log', 'location_update']),
  coords: z
    .object({
      accuracy: z.number().nullable(),
      altitude: z.number().nullable(),
      altitudeAccuracy: z.number().nullable(),
      heading: z.number().nullable(),
      latitude: z.number(),
      longitude: z.number(),
      speed: z.number().nullable(),
    })
    .optional(),
  log: z
    .object({
      type: z.literal('app'),
      level: z.enum(['debug', 'info', 'warn', 'error']),
      message: z.string(),
    })
    .optional(),
  state: MovingState.optional(),
  device: z.string(),
  // Androidのみ対応
  gnss: z
    .object({
      usedInFix: z.number().optional(), // 位置解(=fix)に使われた衛星数
      total: z.number().optional(), // 観測衛星総数
      meanCn0DbHz: z.number().optional(), // C/N0 平均
      maxCn0DbHz: z.number().optional(), // C/N0 最大
      constellations: z.array(z.string()).optional(), // ["GPS","GLONASS","GALILEO",...]
    })
    .nullable()
    .optional(),
  radio: z
    .object({
      isWifiConnected: z.boolean().optional(), // 参考フラグ（iOSは取得制限あり）
    })
    .nullable()
    .optional(),
  timestamp: z.number(),
});

export const useTelemetrySender = (
  sendTelemetryAutomatically = false,
  wsUrl = EXPERIMENTAL_TELEMETRY_ENDPOINT_URL
) => {
  const socketRef = useRef<WebSocket | null>(null);
  const lastSentRef = useRef<number>(0);
  const gnssRef = useRef<GnssState | null>(null);
  const telemetryQueueRef = useRef<string[]>([]);
  const messageQueueRef = useRef<string[]>([]);

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

  const coords = useLocationStore((state) => state?.coords);

  const { arrived: arrivedFromState, approaching: approachingFromState } =
    useAtomValue(stationState);

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
    (message: string, level = 'debug') => {
      const now = Date.now();

      const payload = TelemetryPayload.safeParse({
        schemaVersion: 2,
        type: 'log',
        log: {
          type: 'app',
          level,
          message,
        },
        device: Device.modelName ?? 'unknown',
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
        lastSentRef.current = now;
      } else {
        enqueueMessage(messageQueueRef.current, stringifiedMessage);
      }
    },
    [enqueueMessage]
  );

  const sendTelemetry = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < TELEMETRY_THROTTLE_MS) {
      return;
    }

    const payload = TelemetryPayload.safeParse({
      schemaVersion: 2,
      type: 'location_update',
      coords,
      device: Device.modelName ?? 'unknown',
      state,
      gnss: gnssRef.current ?? null,
      radio: {
        isWifiConnected,
      },
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
      payload.data.coords &&
      payload.data.coords.latitude != null &&
      payload.data.coords.longitude != null;

    if (isPayloadValid) {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(stringifiedData);
        lastSentRef.current = now;
      } else {
        enqueueMessage(telemetryQueueRef.current, stringifiedData);
      }
    }
  }, [coords, state, enqueueMessage, isWifiConnected]);

  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout: number;
    let shouldReconnect = true;

    if (!isTelemetryEnabled) {
      return;
    }

    const connectWebSocket = () => {
      if (!wsUrl || !webSocketUrlRegexp.test(wsUrl)) {
        console.warn('Invalid WebSocket URL');
        return;
      }

      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        socket.onopen = () => {
          console.log('WebSocket connected');
          reconnectAttempts = 0;

          if (sendTelemetryAutomatically) {
            const logPayload = {
              schemaVersion: 2 as const,
              type: 'log' as const,
              log: {
                type: 'app' as const,
                level: 'info' as const,
                message: 'Connected to the telemetry server as a client',
              },
              device: Device.modelName ?? 'unknown',
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
            schemaVersion: 2 as const,
            type: 'log' as const,
            log: {
              type: 'app' as const,
              level: 'info' as const,
              message: 'Disconnected from the telemetry server as a client',
            },
            device: Device.modelName ?? 'unknown',
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
  }, [wsUrl, sendTelemetryAutomatically]);

  useEffect(() => {
    if (!isTelemetryEnabled || !sendTelemetryAutomatically) {
      return;
    }

    sendTelemetry();
  }, [sendTelemetry, sendTelemetryAutomatically]);

  return { sendLog };
};
