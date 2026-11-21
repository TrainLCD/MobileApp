import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { LineNested, Station } from '~/@types/graphql';
import { gqlRequest, graphqlQueryKey } from '~/lib/gql';
import { GET_NEARBY_BUS_STOPS } from '~/lib/graphql/queries';
import { locationAtom } from '~/store/atoms/location';
import { isBusLine } from '~/utils/line';

type BusStop = Pick<Station, 'line'>;

export const useNearbyBusLines = (station: Station | null) => {
  const location = useAtomValue(locationAtom);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;
  const hasLocation = latitude != null && longitude != null;
  const variables = { latitude, longitude };
  const { data } = useQuery({
    queryKey: graphqlQueryKey(GET_NEARBY_BUS_STOPS, variables),
    queryFn: () =>
      gqlRequest<{ nearbyBusStops: BusStop[] }>(
        GET_NEARBY_BUS_STOPS,
        variables
      ),
    enabled: hasLocation && station != null,
  });

  return useMemo(() => {
    if (!station || !hasLocation) return station;
    const railLines = (station.lines ?? []).filter((line) => !isBusLine(line));
    // API は距離順で返すため、同じ路線では最寄りの乗り場を使う。
    const buses = new Map<number, LineNested>();
    for (const stop of data?.nearbyBusStops ?? []) {
      const line = stop.line;
      if (line?.id != null && !buses.has(line.id)) buses.set(line.id, line);
    }
    return { ...station, lines: [...railLines, ...buses.values()] };
  }, [station, hasLocation, data]);
};
