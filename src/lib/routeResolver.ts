import {
  DEV_ROUTE_RESOLVER_API_URL,
  PRODUCTION_ROUTE_RESOLVER_API_URL,
} from 'react-native-dotenv';
import { isDevApp } from '~/utils/isDevApp';

export const ROUTE_RESOLVER_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
export const ROUTE_RESOLVER_TIMEOUT_MS = 10_000;

type ResolverResponse = {
  sids: unknown;
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

// `host` is exposed for testability — production callers should omit it so the
// env-derived value is used.
export const resolveSidsFromShortId = async (
  id: string,
  signal: AbortSignal,
  host: string = getRouteResolverHost()
): Promise<number[]> => {
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
  return payload.sids.map(coerceStationId);
};
