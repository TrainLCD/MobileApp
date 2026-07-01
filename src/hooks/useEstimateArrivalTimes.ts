import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type {
  EstimateArrivalTimesQuery,
  EstimateArrivalTimesQueryVariables,
} from '~/@types/graphql';
import { ESTIMATE_ARRIVAL_TIMES } from '~/lib/graphql/queries';
import { selectedLineAtom } from '../store/atoms/line';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useGraphQLQuery } from './useGraphQLQuery';

export const useEstimateArrivalTimes = () => {
  const stations = useAtomValue(stationsAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const selectedLine = useAtomValue(selectedLineAtom);
  const trainType = useCurrentTrainType();

  const fromStationId =
    selectedDirection === 'OUTBOUND' ? stations.at(-1)?.id : stations[0]?.id;
  const toStationId =
    selectedDirection === 'OUTBOUND' ? stations[0]?.id : stations.at(-1)?.id;

  const viaLineIds = useMemo(
    () => [
      ...new Set(
        stations.map((s) => s.line?.id).filter((id): id is number => id != null)
      ),
    ],
    [stations]
  );

  const skip = !selectedBound || fromStationId == null || toStationId == null;

  const { data, loading, error } = useGraphQLQuery<
    EstimateArrivalTimesQuery,
    EstimateArrivalTimesQueryVariables
  >(ESTIMATE_ARRIVAL_TIMES, {
    variables: {
      fromStationId: fromStationId ?? 0,
      toStationId: toStationId ?? 0,
      viaLineIds,
    },
    skip,
  });

  const matchedRoute = useMemo(() => {
    const routes = data?.estimateArrivalTimes?.routes;
    if (!routes) {
      return null;
    }

    const filteringId = trainType?.groupId ?? selectedLine?.id;
    if (filteringId == null) {
      return null;
    }

    return routes.find((r) => r.id === filteringId) ?? null;
  }, [data, trainType?.groupId, selectedLine?.id]);

  return { route: matchedRoute, loading, error };
};
