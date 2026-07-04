import { useMemo } from 'react';
import type { useEstimateArrivalTimes } from './useEstimateArrivalTimes';

type EstimatedRoute = ReturnType<typeof useEstimateArrivalTimes>['route'];

export const useEstimatedMinutesByStationId = (
  estimatedRoute: EstimatedRoute
) =>
  useMemo(
    () =>
      new Map(
        estimatedRoute?.stops
          ?.filter((s) => s.stationId != null)
          .map((s) => [s.stationId as number, s.cumulativeMinutes]) ?? []
      ),
    [estimatedRoute]
  );
