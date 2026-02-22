import * as Device from 'expo-device';
import { useEffect, useRef } from 'react';
import {
  EXPERIMENTAL_TELEMETRY_ENDPOINT_URL,
  EXPERIMENTAL_TELEMETRY_TOKEN,
} from 'react-native-dotenv';
import { z } from 'zod';
import { TELEMETRY_MAX_QUEUE_SIZE } from '~/constants/telemetry';
import { useTelemetryEnabled } from './useTelemetryEnabled';

const LogRequest = z.object({
  device: z.string(),
  timestamp: z.number(),
  log: z.object({
    type: z.enum(['system', 'app', 'client']),
    level: z.enum(['debug', 'info', 'warn', 'error']),
    message: z.string().min(1),
  }),
});

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type QueuedLog = {
  message: string;
  level: LogLevel;
  timestamp: number;
};

const originalConsole = {
  log: console.log.bind(console),
  debug: console.debug.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

const formatArgs = (args: unknown[]): string =>
  args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');

export const useConsoleTelemetry = (
  baseUrl = EXPERIMENTAL_TELEMETRY_ENDPOINT_URL,
  token = EXPERIMENTAL_TELEMETRY_TOKEN
): void => {
  const isTelemetryEnabled = useTelemetryEnabled();
  const queueRef = useRef<QueuedLog[]>([]);
  const isFlushingRef = useRef(false);

  useEffect(() => {
    if (!isTelemetryEnabled || !baseUrl) {
      return;
    }

    const enqueue = (level: LogLevel, args: unknown[]) => {
      if (isFlushingRef.current) {
        return;
      }
      const message = formatArgs(args);
      if (!message) {
        return;
      }

      const queue = queueRef.current;
      if (queue.length >= TELEMETRY_MAX_QUEUE_SIZE) {
        queue.shift();
      }
      queue.push({ message, level, timestamp: Date.now() });
    };

    console.log = (...args: unknown[]) => {
      enqueue('info', args);
      originalConsole.log(...args);
    };
    console.debug = (...args: unknown[]) => {
      enqueue('debug', args);
      originalConsole.debug(...args);
    };
    console.warn = (...args: unknown[]) => {
      enqueue('warn', args);
      originalConsole.warn(...args);
    };
    console.error = (...args: unknown[]) => {
      enqueue('error', args);
      originalConsole.error(...args);
    };

    const device = Device.modelName ?? 'unknown';

    const flush = async () => {
      const queue = queueRef.current;
      if (isFlushingRef.current || queue.length === 0) {
        return;
      }

      isFlushingRef.current = true;
      const logs = queue.splice(0, queue.length);

      await Promise.allSettled(
        logs.map(async (log) => {
          const payload = LogRequest.safeParse({
            device,
            timestamp: log.timestamp,
            log: {
              type: 'client',
              level: log.level,
              message: log.message,
            },
          });

          if (payload.error) {
            return;
          }

          try {
            await fetch(`${baseUrl}/api/log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload.data),
            });
          } catch {
            // NOTE: 送信失敗時はカスケードエラーを防ぐため静かに無視する
          }
        })
      );

      isFlushingRef.current = false;
    };

    const intervalId = setInterval(flush, 1000);

    return () => {
      console.log = originalConsole.log;
      console.debug = originalConsole.debug;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      clearInterval(intervalId);
      flush();
    };
  }, [isTelemetryEnabled, baseUrl, token]);
};
