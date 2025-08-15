import * as Device from 'expo-device';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { EXPERIMENTAL_TELEMETRY_ENDPOINT_URL } from 'react-native-dotenv';
import { z } from 'zod';
import { webSocketUrlRegexp } from '~/constants/regexp';
import {
  TELEMETRY_MAX_QUEUE_SIZE,
  TELEMETRY_THROTTLE_MS,
} from '~/constants/telemetry';
import { type GnssState, subscribeGnss } from '~/utils/native/ios/gnssModule';
import { isTelemetryEnabled } from '~/utils/telemetryConfig';
import stationState from '../store/atoms/station';
import { useIsPassing } from './useIsPassing';
import { useLocationStore } from './useLocationStore';
import { NetworkStateType, useNetworkState } from 'expo-network';

const MovingState = z.enum(['arrived', 'approaching', 'passing', 'moving']);
type MovingState = z.infer<typeof MovingState>;

const TelemetryPayload = z.object({
  schemaVersion: z.number(),
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
  const telemetryQueue = useRef<string[]>([]).current;
  const messageQueue = useRef<string[]>([]).current;

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
      if (now - lastSentRef.current < TELEMETRY_THROTTLE_MS) {
        return;
      }

      const payload = TelemetryPayload.safeParse({
        schemaVersion: 2,
        log: {
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

      const strigifiedMessage = JSON.stringify({
        type: 'log',
        ...payload.data,
      });

      if (socketRef.current?.readyState === WebSocket.OPEN && payload.success) {
        if (payload.data.log) {
          socketRef.current.send(strigifiedMessage);
          lastSentRef.current = now;
        }
      } else {
        enqueueMessage(messageQueue, strigifiedMessage);
      }
    },
    [messageQueue, enqueueMessage]
  );

  const sendTelemetry = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < TELEMETRY_THROTTLE_MS) {
      return;
    }

    const payload = TelemetryPayload.safeParse({
      schemaVersion: 2,
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

    const strigifiedData = JSON.stringify({
      type: 'location_update',
      ...payload.data,
    });

    const isPayloadValid =
      payload.data.coords &&
      payload.data.coords.latitude != null &&
      payload.data.coords.longitude != null;

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      if (isPayloadValid) {
        socketRef.current.send(strigifiedData);
        lastSentRef.current = now;
      }
    } else if (isPayloadValid) {
      enqueueMessage(telemetryQueue, strigifiedData);
    }
  }, [coords, state, enqueueMessage, telemetryQueue, isWifiConnected]);

  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout: number;

    if (!isTelemetryEnabled) {
      return;
    }

    const connectWebSocket = () => {
      if (!wsUrl.match(webSocketUrlRegexp)) {
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
            sendLog('Connected to the telemetry server as a client', 'info');
          }

          while (messageQueue.length > 0) {
            const msg = messageQueue.shift();
            if (msg) socket.send(msg);
          }
          while (telemetryQueue.length > 0) {
            const msg = telemetryQueue.shift();
            if (msg) socket.send(msg);
          }
        };
        socket.onerror = (e) => {
          console.warn('WebSocket error', e);
        };
        socket.onclose = () => {
          console.log('WebSocket closed');
          sendLog('Disconnected from the telemetry server as a client', 'info');
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
            reconnectTimeout = setTimeout(connectWebSocket, delay);
          }
        };
        return socket;
      } catch (error) {
        console.error('WebSocket connection error:', error);
      }
    };

    const socket = connectWebSocket();

    return () => {
      socket?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [
    wsUrl,
    sendTelemetryAutomatically,
    messageQueue.length,
    messageQueue.shift,
    telemetryQueue.length,
    telemetryQueue.shift,
    sendLog,
  ]);

  useEffect(() => {
    if (!isTelemetryEnabled || !sendTelemetryAutomatically) {
      return;
    }

    sendTelemetry();
  }, [sendTelemetry, sendTelemetryAutomatically]);

  return { sendLog };
};
