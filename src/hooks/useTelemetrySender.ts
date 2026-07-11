import * as Application from 'expo-application';
import * as Battery from 'expo-battery';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import {
  EXPERIMENTAL_TELEMETRY_ENDPOINT_URL,
  EXPERIMENTAL_TELEMETRY_TOKEN,
} from 'react-native-dotenv';
import { z } from 'zod';
import { TELEMETRY_THROTTLE_MS } from '~/constants/telemetry';
import { locationAtom } from '~/store/atoms/location';
import { isDevApp } from '~/utils/isDevApp';
import { sanitizeTelemetryMessage } from '~/utils/sanitizeTelemetryMessage';
import { approachingAtom, arrivedAtom } from '../store/atoms/station';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useIsPassing } from './useIsPassing';
import { useTelemetryEnabled } from './useTelemetryEnabled';

const MovingState = z.enum(['arrived', 'approaching', 'passing', 'moving']);
type MovingState = z.infer<typeof MovingState>;

// テレメトリ基盤のGraphQL enum BatteryState(駅情報APIとは別基盤)
const TelemetryBatteryState = z.enum([
  'unknown',
  'unplugged',
  'charging',
  'full',
]);
type TelemetryBatteryState = z.infer<typeof TelemetryBatteryState>;

const BATTERY_STATE_MAP: Record<Battery.BatteryState, TelemetryBatteryState> = {
  [Battery.BatteryState.UNKNOWN]: 'unknown',
  [Battery.BatteryState.UNPLUGGED]: 'unplugged',
  [Battery.BatteryState.CHARGING]: 'charging',
  [Battery.BatteryState.FULL]: 'full',
};

// テレメトリ基盤のGraphQL LocationEventInputに対応
const LocationEventInput = z.object({
  sessionId: z.string().min(1),
  device: z.string(),
  state: MovingState,
  stationId: z.number().nullable().optional(),
  lineId: z.number(),
  coords: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().nullable().optional(),
    // km/h(expo-locationのm/sではない)
    speed: z.number().nullable().optional(),
  }),
  batteryLevel: z.number().nullable().optional(),
  batteryState: TelemetryBatteryState.nullable().optional(),
  timestamp: z.number(),
});

const SEND_LOCATION_MUTATION = `
  mutation SendLocation($input: LocationEventInput!) {
    sendLocation(input: $input) {
      sessionId
      warning
    }
  }
`;

// 認可エラー等もHTTP 200 + errors配列で返る
const SendLocationResponse = z
  .object({
    data: z
      .object({
        sendLocation: z.object({
          sessionId: z.string(),
          warning: z.string().nullable().optional(),
        }),
      })
      .nullable()
      .optional(),
    errors: z.array(z.object({ message: z.string() })).optional(),
  })
  // {}のような空レスポンスを不正として弾く
  .refine((res) => res.data != null || (res.errors?.length ?? 0) > 0, {
    message: 'Either data.sendLocation or non-empty errors is required',
  });

// テレメトリ基盤のGraphQL enum Platform
const TelemetryPlatform = z.enum(['ios', 'android', 'macos', 'unknown']);
type TelemetryPlatform = z.infer<typeof TelemetryPlatform>;

const getTelemetryPlatform = (): TelemetryPlatform => {
  switch (Platform.OS) {
    case 'ios':
    case 'android':
    case 'macos':
      return Platform.OS;
    default:
      return 'unknown';
  }
};

// テレメトリ基盤のGraphQL LogEventInputに対応
const LogEventInput = z.object({
  sessionId: z.string().min(1),
  device: z.string().nullable().optional(),
  appVersion: z.string().min(1),
  platform: TelemetryPlatform,
  channel: z.enum(['production', 'canary']),
  timestamp: z.number(),
  type: z.enum(['system', 'app', 'client']),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string().min(1),
});

const SEND_LOG_EVENT_MUTATION = `
  mutation SendLogEvent($input: LogEventInput!) {
    sendLogEvent(input: $input) {
      sessionId
    }
  }
`;

const SendLogEventResponse = z
  .object({
    data: z
      .object({
        sendLogEvent: z.object({
          sessionId: z.string(),
        }),
      })
      .nullable()
      .optional(),
    errors: z.array(z.object({ message: z.string() })).optional(),
  })
  // {}のような空レスポンスを不正として弾く
  .refine((res) => res.data != null || (res.errors?.length ?? 0) > 0, {
    message: 'Either data.sendLogEvent or non-empty errors is required',
  });

export const useTelemetrySender = (
  sendTelemetryAutomatically = false,
  baseUrl = EXPERIMENTAL_TELEMETRY_ENDPOINT_URL,
  token = EXPERIMENTAL_TELEMETRY_TOKEN
) => {
  const lastSentTelemetryRef = useRef<number>(0);
  // テレメトリ基盤がセッション単位で位置情報を紐付けるためのID。初回送信時に生成する
  const sessionIdRef = useRef<string | null>(null);

  const station = useCurrentStation();
  const line = useCurrentLine();

  const coords = useAtomValue(locationAtom)?.coords;

  const arrivedFromState = useAtomValue(arrivedAtom);
  const approachingFromState = useAtomValue(approachingAtom);
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

  const getSessionId = useCallback(() => {
    if (sessionIdRef.current == null) {
      sessionIdRef.current = Crypto.randomUUID();
    }
    return sessionIdRef.current;
  }, []);

  const sendLog = useCallback(
    async (
      message: string,
      level: 'debug' | 'info' | 'warn' | 'error' = 'debug'
    ) => {
      if (!isTelemetryEnabled || !baseUrl) {
        return;
      }

      const now = Date.now();

      const payload = LogEventInput.safeParse({
        sessionId: getSessionId(),
        device: Device.modelName ?? 'unknown',
        appVersion: `${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`,
        platform: getTelemetryPlatform(),
        channel: isDevApp ? 'canary' : 'production',
        timestamp: now,
        type: 'app',
        level,
        message: sanitizeTelemetryMessage(message),
      });

      if (payload.error) {
        console.error('Invalid log payload:', payload.error);
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: SEND_LOG_EVENT_MUTATION,
            variables: { input: payload.data },
          }),
        });

        if (!response.ok) {
          console.error(
            `HTTP error: ${response.status} ${response.statusText}`
          );
          return;
        }

        let json: unknown;
        try {
          json = await response.json();
        } catch {
          console.error('Failed to parse response JSON');
          return;
        }

        const result = SendLogEventResponse.safeParse(json);
        if (!result.success) {
          console.error('Invalid log response:', result.error, json);
          return;
        }
        if (result.data.errors?.length) {
          console.warn(
            'Log API error:',
            result.data.errors.map((e) => e.message).join(', ')
          );
        }
      } catch (error) {
        console.error('Failed to send log:', error);
      }
    },
    [isTelemetryEnabled, baseUrl, token, getSessionId]
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

    let batteryLevel: number | null = null;
    let batteryState: Battery.BatteryState | null = null;
    try {
      const batteryLevelRaw = await Battery.getBatteryLevelAsync();
      if (batteryLevelRaw === -1) {
        batteryLevel = null;
      } else {
        batteryLevel = batteryLevelRaw;
      }
      batteryState = await Battery.getBatteryStateAsync();
    } catch {
      batteryLevel = null;
      batteryState = null;
    }

    const payload = LocationEventInput.safeParse({
      sessionId: getSessionId(),
      device: Device.modelName ?? 'unknown',
      state,
      lineId: line.id,
      stationId: station?.id ?? null,
      coords: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        // expo-locationはm/s。負値は測位不能を表すためnullに落とす
        speed:
          coords.speed != null && coords.speed >= 0 ? coords.speed * 3.6 : null,
      },
      batteryLevel,
      batteryState:
        batteryState != null ? BATTERY_STATE_MAP[batteryState] : null,
      timestamp: now,
    });

    if (payload.error) {
      console.error('Invalid location payload:', payload.error);
      return;
    }

    lastSentTelemetryRef.current = now;

    try {
      const response = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: SEND_LOCATION_MUTATION,
          variables: { input: payload.data },
        }),
      });

      if (!response.ok) {
        console.error(`HTTP error: ${response.status} ${response.statusText}`);
        return;
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        console.error('Failed to parse response JSON');
        return;
      }

      const result = SendLocationResponse.safeParse(json);
      if (!result.success) {
        console.error('Invalid location response:', result.error, json);
        return;
      }
      if (result.data.errors?.length) {
        console.warn(
          'Location API error:',
          result.data.errors.map((e) => e.message).join(', ')
        );
      } else if (result.data.data?.sendLocation.warning) {
        console.warn(
          'Location API warning:',
          result.data.data.sendLocation.warning
        );
      }
    } catch (error) {
      console.error('Failed to send location:', error);
    }
  }, [
    coords,
    state,
    isTelemetryEnabled,
    line?.id,
    station?.id,
    baseUrl,
    token,
    getSessionId,
  ]);

  useEffect(() => {
    if (!isTelemetryEnabled || !sendTelemetryAutomatically) {
      return;
    }

    sendTelemetry();
  }, [sendTelemetry, sendTelemetryAutomatically, isTelemetryEnabled]);

  return { sendLog };
};
