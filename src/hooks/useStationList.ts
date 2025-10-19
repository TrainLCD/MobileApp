import { useQuery } from '@apollo/client/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useMemo } from 'react';
import type {
  Station,
  TrainDirection,
  TrainType,
  TrainTypeKind,
} from '~/@types/graphql';
import {
  GET_LINE_STATIONS,
  GET_STATION_TRAIN_TYPES,
} from '~/lib/graphql/queries';
import lineState from '../store/atoms/line';
import type { NavigationState } from '../store/atoms/navigation';
import navigationState from '../store/atoms/navigation';
import type { StationState } from '../store/atoms/station';
import stationState from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';

// Helper to create the default local train type
const createLocalTrainType = (): TrainType => ({
  __typename: 'TrainType',
  id: 0,
  typeId: 0,
  groupId: 0,
  name: '普通/各駅停車',
  nameKatakana: '',
  nameRoman: 'Local',
  nameChinese: '慢车/每站停车',
  nameKorean: '보통/각역정차',
  color: '',
  lines: [],
  direction: 'Both' as TrainDirection,
  kind: 'Default' as TrainTypeKind,
  line: undefined,
});

type GetLineStationsData = {
  lineStations: Station[];
};

type GetLineStationsVariables = {
  lineId: number;
  stationId?: number;
};

type GetStationTrainTypesData = {
  stationTrainTypes: TrainType[];
};

type GetStationTrainTypesVariables = {
  stationId: number;
};

export const useStationList = () => {
  const setStationState = useSetAtom(stationState);
  const setNavigationState = useSetAtom(navigationState);
  const { selectedLine } = useAtomValue(lineState);

  const station = useCurrentStation();

  // NOTE: メイン画面で他路線に直通後はselectedLineと実際の路線が違う可能性があるため最新の路線情報を使う
  const currentLine = useMemo(
    () => station?.line ?? selectedLine,
    [station, selectedLine]
  );

  const {
    data: byLineIdData,
    loading: isLoadingStations,
    error: loadingStationsError,
    refetch: refetchStations,
  } = useQuery<GetLineStationsData, GetLineStationsVariables>(
    GET_LINE_STATIONS,
    {
      variables: {
        // biome-ignore lint/style/noNonNullAssertion: skip guard ensures selectedLine.id exists
        lineId: selectedLine!.id!,
        stationId: selectedLine?.station?.id ?? undefined,
      },
      skip: !selectedLine?.id,
    }
  );

  const {
    data: fetchedTrainTypesData,
    loading: isTrainTypesLoading,
    error: trainTypesFetchError,
    refetch: refetchTrainTypes,
  } = useQuery<GetStationTrainTypesData, GetStationTrainTypesVariables>(
    GET_STATION_TRAIN_TYPES,
    {
      variables: {
        stationId: currentLine?.station?.id as number,
      },
      skip: !currentLine?.station?.id,
    }
  );

  const designatedTrainType = useMemo(
    () =>
      byLineIdData?.lineStations.find(
        (s: Station) => s.id === currentLine?.station?.id
      )?.trainType ?? null,
    [byLineIdData?.lineStations, currentLine?.station?.id]
  );

  useEffect(() => {
    setStationState((prev: StationState) => ({
      ...prev,
      stations: prev.stations.length
        ? prev.stations
        : (byLineIdData?.lineStations ?? []),
    }));
    if (designatedTrainType) {
      setNavigationState((prev: NavigationState) => ({
        ...prev,
        trainType: prev.trainType ? prev.trainType : designatedTrainType,
      }));
    }
  }, [
    byLineIdData?.lineStations,
    designatedTrainType,
    setNavigationState,
    setStationState,
  ]);

  useEffect(() => {
    const localType = createLocalTrainType();

    const fetchedTrainTypes = fetchedTrainTypesData?.stationTrainTypes ?? [];

    if (!designatedTrainType) {
      setNavigationState((prev: NavigationState) => ({
        ...prev,
        fetchedTrainTypes: [localType, ...fetchedTrainTypes],
      }));
      return;
    }

    setNavigationState((prev: NavigationState) => ({
      ...prev,
      fetchedTrainTypes,
    }));
  }, [
    designatedTrainType,
    fetchedTrainTypesData?.stationTrainTypes,
    setNavigationState,
  ]);

  return {
    refetchStations,
    refetchTrainTypes,
    stations: byLineIdData?.lineStations ?? [],
    trainTypes: fetchedTrainTypesData?.stationTrainTypes ?? [],
    loading: isLoadingStations || isTrainTypesLoading,
    error: loadingStationsError || trainTypesFetchError,
  };
};
