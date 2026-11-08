import { useAtomValue, useStore } from 'jotai';
import { useEffect } from 'react';
import type { Station } from '~/@types/graphql';
import { GET_LINE_LIST_STATIONS } from '~/lib/graphql/queries';
import { rawLocationAtom } from '~/store/atoms/location';
import {
  detectedServicePatternMismatchAtom,
  servicePatternRouteAtom,
} from '~/store/atoms/servicePatternMismatch';
import dropEitherJunctionStation from '~/utils/dropJunctionStation';
import reverseStations from '~/utils/reverseStations';
import { createServicePatternDetector } from '~/utils/servicePatternMismatch';
import { useGraphQLQuery } from './useGraphQLQuery';
import { useLoopLine } from './useLoopLine';

export const useServicePatternMismatch = (): void => {
  const store = useStore();
  const route = useAtomValue(servicePatternRouteAtom);
  const busLineId = route?.busLineId;
  const { isLoopLine } = useLoopLine();
  // GTFS group stations contain only the stops served by that pattern.
  // The line list contains the union, including stops in other patterns.
  const { data } = useGraphQLQuery<
    { lineListStations: Station[] },
    { lineIds: number[] }
  >(GET_LINE_LIST_STATIONS, {
    variables: busLineId == null ? undefined : { lineIds: [busLineId] },
    skip: busLineId == null,
  });
  const otherBusStops = busLineId == null ? null : data?.lineListStations;

  useEffect(() => {
    if (!route || otherBusStops === undefined) {
      return;
    }
    const stations = dropEitherJunctionStation(route.stations, route.direction);
    const isInbound = route.direction === 'INBOUND';
    const ordered =
      isInbound === isLoopLine ? reverseStations(stations) : stations;
    const observe = createServicePatternDetector(ordered, otherBusStops);
    const startedAt = Date.now();

    // React のレンダーに依存せず、rawLocationAtom に届いた測位を順番に処理する。
    return store.sub(rawLocationAtom, () => {
      const location = store.get(rawLocationAtom);
      if (
        !location ||
        location.timestamp < startedAt ||
        store.get(servicePatternRouteAtom) !== route ||
        store.get(detectedServicePatternMismatchAtom)?.route === route
      ) {
        return;
      }
      const mismatch = observe(location, Date.now());
      if (mismatch) {
        store.set(detectedServicePatternMismatchAtom, { route, mismatch });
      }
    });
  }, [isLoopLine, otherBusStops, route, store]);
};
