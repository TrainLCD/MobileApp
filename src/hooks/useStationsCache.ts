import { useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import type { LineNested, Station } from '~/@types/graphql';
import { gqlClient } from '~/lib/gql';
import { GET_LINE_LIST_STATIONS_LIGHT } from '~/lib/graphql/queries';
import stationState from '../store/atoms/station';

const updateStationsCache = async (
  station: Station,
  setStationState: ReturnType<typeof useSetAtom<typeof stationState>>
) => {
  const fetchedLines = (station.lines ?? []).filter(
    (line): line is LineNested => line?.id != null
  );

  const lineIds = fetchedLines.map((line) => line.id as number);
  if (lineIds.length === 0) return;

  let allStations: Station[];
  try {
    const result = await gqlClient.query<{
      lineListStations: Station[];
    }>({
      query: GET_LINE_LIST_STATIONS_LIGHT,
      variables: { lineIds },
    });
    allStations = result.data?.lineListStations ?? [];
  } catch (err) {
    console.error(err);
    return;
  }
  const stationsByLineId = new Map<number, Station[]>();
  for (const s of allStations) {
    const lid = s.line?.id;
    if (lid == null) continue;
    const arr = stationsByLineId.get(lid);
    if (arr) {
      arr.push(s);
    } else {
      stationsByLineId.set(lid, [s]);
    }
  }

  const stationsCache: Station[][] = fetchedLines.map(
    (line) => stationsByLineId.get(line.id as number) ?? []
  );

  setStationState((prev) => ({
    ...prev,
    stationsCache,
  }));
};

export const useStationsCache = (station: Station | null): void => {
  const setStationState = useSetAtom(stationState);

  const updateCache = useCallback(
    async (station: Station) => {
      await updateStationsCache(station, setStationState);
    },
    [setStationState]
  );

  useEffect(() => {
    if (!station) return;
    updateCache(station);
  }, [station, updateCache]);
};
