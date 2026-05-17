import {
  DEV_ROUTE_RESOLVER_API_URL,
  PRODUCTION_ROUTE_RESOLVER_API_URL,
} from 'react-native-dotenv';
import { isDevApp } from '~/utils/isDevApp';

export const ROUTE_RESOLVER_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
export const ROUTE_RESOLVER_TIMEOUT_MS = 10_000;

type ResolverResponse = {
  sids: unknown;
  skips?: unknown;
};

export type ResolvedRoute = {
  stationIds: number[];
  skipIndices: ReadonlySet<number> | null;
};

export const getRouteResolverHost = (): string => {
  const host = isDevApp
    ? DEV_ROUTE_RESOLVER_API_URL
    : PRODUCTION_ROUTE_RESOLVER_API_URL;
  if (typeof host !== 'string' || host.trim().length === 0) {
    throw new Error(
      'route resolver host is not configured. Set DEV_ROUTE_RESOLVER_API_URL / PRODUCTION_ROUTE_RESOLVER_API_URL in .env.local.'
    );
  }
  return host.replace(/\/+$/, '');
};

// Resolver responses are user-controlled in practice — keep parsing strict so
// a stray string / negative value cannot leak into GraphQL Int variables.
const coerceStationId = (raw: unknown): number => {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
    return raw;
  }
  if (typeof raw === 'string' && /^[1-9]\d*$/.test(raw)) {
    return Number(raw);
  }
  throw new Error('route resolver returned non-integer sid');
};

const coerceSkipIndex = (raw: unknown): number => {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) {
    return raw;
  }
  if (typeof raw === 'string' && /^(0|[1-9]\d*)$/.test(raw)) {
    return Number(raw);
  }
  throw new Error('route resolver returned non-integer skip index');
};

// Mirrors the validation applied to the URL `?skips=` parameter: every index
// must be in [0, sids.length - 1] and strictly ascending (which also rules out
// duplicates). Returning null for absent / empty skips matches the "全駅停車"
// default of the URL form.
const parseSkipIndices = (
  raw: unknown,
  sidsLength: number
): ReadonlySet<number> | null => {
  if (raw == null) {
    return null;
  }
  if (!Array.isArray(raw)) {
    throw new Error('route resolver returned malformed skips');
  }
  if (raw.length === 0) {
    return null;
  }
  const parsed = raw.map(coerceSkipIndex);
  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i] >= sidsLength) {
      throw new Error('route resolver returned out-of-range skip index');
    }
    if (i > 0 && parsed[i] <= parsed[i - 1]) {
      throw new Error('route resolver returned non-ascending skip indices');
    }
  }
  return new Set(parsed);
};

// `host` is exposed for testability — production callers should omit it so the
// env-derived value is used.
export const resolveSidsFromShortId = async (
  id: string,
  signal: AbortSignal,
  host: string = getRouteResolverHost()
): Promise<ResolvedRoute> => {
  const base = host.replace(/\/+$/, '');
  const response = await fetch(`${base}/api/routes/${id}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`route resolver responded with ${response.status}`);
  }
  const payload = (await response.json()) as ResolverResponse;
  if (!Array.isArray(payload.sids) || payload.sids.length < 2) {
    throw new Error('route resolver returned malformed sids');
  }
  const stationIds = payload.sids.map(coerceStationId);
  const skipIndices = parseSkipIndices(payload.skips, stationIds.length);
  return { stationIds, skipIndices };
};
