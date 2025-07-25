import { useQuery } from '@connectrpc/connect-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useMemo } from 'react';
import {
  TrainDirection,
  TrainType,
  TrainTypeKind,
} from '~/gen/proto/stationapi_pb';
import {
  getStationsByLineId,
  getTrainTypesByStationId,
} from '~/gen/proto/stationapi-StationAPI_connectquery';
import lineState from '../store/atoms/line';
import type { NavigationState } from '../store/atoms/navigation';
import navigationState from '../store/atoms/navigation';
import type { StationState } from '../store/atoms/station';
import stationState from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';

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
    isLoading: isLoadingStations,
    error: loadingStationsError,
    refetch: refetchStations,
  } = useQuery(
    getStationsByLineId,
    // NOTE: ここでselectedLineを使わないとどの路線選んでも同じ行先が表示される
    { lineId: selectedLine?.id, stationId: selectedLine?.station?.id },
    {
      enabled: !!selectedLine,
    }
  );

  const {
    data: fetchedTrainTypesData,
    isLoading: isTrainTypesLoading,
    error: trainTypesFetchError,
    refetch: refetchTrainTypes,
  } = useQuery(
    getTrainTypesByStationId,
    {
      stationId: currentLine?.station?.id,
    },
    { enabled: !!currentLine }
  );

  const designatedTrainType = useMemo(
    () =>
      byLineIdData?.stations.find((s) => s.id === currentLine?.station?.id)
        ?.trainType ?? null,
    [byLineIdData?.stations, currentLine?.station?.id]
  );

  useEffect(() => {
    setStationState((prev: StationState) => ({
      ...prev,
      stations: prev.stations.length
        ? prev.stations
        : (byLineIdData?.stations ?? []),
    }));
    if (designatedTrainType) {
      setNavigationState((prev: NavigationState) => ({
        ...prev,
        trainType: prev.trainType ? prev.trainType : designatedTrainType,
      }));
    }
  }, [
    byLineIdData?.stations,
    designatedTrainType,
    setNavigationState,
    setStationState,
  ]);

  useEffect(() => {
    const localType = new TrainType({
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
      direction: TrainDirection.Both,
      kind: TrainTypeKind.Default,
    });

    const fetchedTrainTypes = fetchedTrainTypesData?.trainTypes ?? [];

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
    fetchedTrainTypesData?.trainTypes,
    setNavigationState,
  ]);

  return {
    refetchStations,
    refetchTrainTypes,
    stations: byLineIdData?.stations ?? [],
    trainTypes: fetchedTrainTypesData?.trainTypes ?? [],
    loading: isLoadingStations || isTrainTypesLoading,
    error: loadingStationsError || trainTypesFetchError,
  };
};
