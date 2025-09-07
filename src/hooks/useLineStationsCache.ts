import { useMutation } from '@connectrpc/connect-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef } from 'react';
import type { Station } from '~/gen/proto/stationapi_pb';
import { getStationsByLineId } from '~/gen/proto/stationapi-StationAPI_connectquery';

const STORAGE_PREFIX = 'lineStationsCache:v1:';
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

type CacheEntry = {
  ts: number;
  stations: Station[];
};

export const useLineStationsCache = () => {
  const { mutateAsync: fetchByLineId } = useMutation(getStationsByLineId);
  const memCacheRef = useRef(new Map<number, Station[]>());
  const pendingRef = useRef(new Map<number, Promise<Station[]>>());

  const readFromStorage = useCallback(async (lineId: number) => {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${lineId}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as CacheEntry;
      if (!parsed?.stations || !parsed?.ts) return null;
      if (Date.now() - parsed.ts > TTL_MS) return null;
      return parsed.stations;
    } catch {
      return null;
    }
  }, []);

  const writeToStorage = useCallback(
    async (lineId: number, stations: Station[]) => {
      const entry: CacheEntry = { ts: Date.now(), stations };
      try {
        await AsyncStorage.setItem(
          `${STORAGE_PREFIX}${lineId}`,
          JSON.stringify(entry)
        );
      } catch {
        // ignore storage errors
      }
    },
    []
  );

  const fetchAndCache = useCallback(
    async (lineId: number): Promise<Station[]> => {
      const existing = pendingRef.current.get(lineId);
      if (existing) return existing;
      const p = fetchByLineId({ lineId }).then(({ stations }) => {
        memCacheRef.current.set(lineId, stations);
        void writeToStorage(lineId, stations);
        pendingRef.current.delete(lineId);
        return stations;
      });
      pendingRef.current.set(lineId, p);
      return p;
    },
    [fetchByLineId, writeToStorage]
  );

  const getStations = useCallback(
    async (lineId: number): Promise<Station[]> => {
      // memory first
      const mem = memCacheRef.current.get(lineId);
      if (mem) return mem;
      // storage next
      const stored = await readFromStorage(lineId);
      if (stored?.length) {
        memCacheRef.current.set(lineId, stored);
        // refresh in background
        void fetchAndCache(lineId);
        return stored;
      }
      // network
      return fetchAndCache(lineId);
    },
    [fetchAndCache, readFromStorage]
  );

  const prime = useCallback(
    async (lineIds: number[], concurrency = 3) => {
      const queue = [...new Set(lineIds)];
      let i = 0;
      const workers = Array(Math.min(concurrency, queue.length))
        .fill(null)
        .map(async () => {
          while (i < queue.length) {
            const idx = i++;
            const id = queue[idx];
            try {
              await getStations(id);
            } catch {
              // ignore individual failures
            }
          }
        });
      await Promise.all(workers);
    },
    [getStations]
  );

  const clear = useCallback(async () => {
    memCacheRef.current.clear();
  }, []);

  return { getStations, prime, clear, memCacheRef };
};
