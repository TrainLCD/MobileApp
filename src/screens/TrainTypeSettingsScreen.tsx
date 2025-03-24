import { useQuery } from '@connectrpc/connect-query';
import { useNavigation } from '@react-navigation/native';
import uniqBy from 'lodash/uniqBy';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useRecoilState } from 'recoil';
import { getStationsByLineGroupId } from '../../gen/proto/stationapi-StationAPI_connectquery';
import type { TrainType } from '../../gen/proto/stationapi_pb';
import FAB from '../components/FAB';
import { FilterModal, type SearchQuery } from '../components/FilterModal';
import Heading from '../components/Heading';
import { TrainTypeInfoModal } from '../components/TrainTypeInfoModal';
import { TrainTypeList } from '../components/TrainTypeList';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { translate } from '../translation';

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 48, paddingVertical: 12 },
  listContainer: { flex: 1, width: '65%', alignSelf: 'center' },
});

const TrainTypeSettings: React.FC = () => {
  const [isTrainTypeModalVisible, setIsTrainTypeModalVisible] = useState(false);
  const [selectedTrainType, setSelectedTrainType] = useState<TrainType | null>(
    null
  );
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  const [{ fetchedTrainTypes }, setNavigationState] =
    useRecoilState(navigationState);
  const [{ stations: stationsFromState }, setStationState] =
    useRecoilState(stationState);

  const defaultQueries: SearchQuery[] = useMemo(() => {
    const allLines = uniqBy(
      fetchedTrainTypes.flatMap((tt) => tt.lines.map((l) => l)),
      'id'
    );
    const allTrainTypes = fetchedTrainTypes.flatMap((tt) =>
      tt.lines
        .map((l) => ({ ...l.trainType, line: l }))
        .filter((tt) => tt !== undefined)
    );
    return allLines.map((l) => ({
      id: l.id,
      name: l.nameShort,
      options: uniqBy(
        allTrainTypes
          .filter((tt) => tt.line?.id === l.id)
          .map((tt) => ({
            id: tt.typeId as number,
            name: tt.name as string,
            parentId: l.id,
            color: tt.color as string,
            active: true,
          })),
        'id'
      ),
    }));
  }, [fetchedTrainTypes]);

  const [queries, setQueries] = useState<SearchQuery[]>(defaultQueries);

  const navigation = useNavigation();

  const {
    data: byLineGroupIdData,
    isLoading: isLineGroupByIdLoading,
    error: byLineGroupIdFetchError,
  } = useQuery(
    getStationsByLineGroupId,
    {
      lineGroupId: selectedTrainType?.groupId,
    },
    { enabled: !!selectedTrainType }
  );

  const stations = useMemo(
    () =>
      byLineGroupIdData?.stations?.length
        ? byLineGroupIdData.stations
        : stationsFromState,
    [byLineGroupIdData?.stations, stationsFromState]
  );

  const onPressBack = useCallback(async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onPressBack();
      return true;
    });
    return (): void => {
      handler.remove();
    };
  }, [onPressBack]);

  const handleSelect = (tt: TrainType) => {
    setSelectedTrainType(tt);
    setIsTrainTypeModalVisible(true);
  };

  const handleTrainTypeConfirmed = useCallback(
    async (trainType: TrainType | undefined) => {
      if (trainType?.id === 0) {
        setNavigationState((prev) => ({
          ...prev,
          trainType: null,
        }));
        // 種別が変わるとすでに選択していた行先が停車駅に存在しない場合があるのでリセットする
        setStationState((prev) => ({
          ...prev,
          wantedDestination: null,
        }));
        setIsTrainTypeModalVisible(false);

        if (navigation.canGoBack()) {
          navigation.goBack();
        }
        return;
      }

      const selectedTrainType = fetchedTrainTypes?.find(
        (tt) => tt.id === trainType?.id
      );

      if (!selectedTrainType) {
        return;
      }

      setNavigationState((prev) => ({
        ...prev,
        trainType: selectedTrainType,
      }));
      // 種別が変わるとすでに選択していた行先が停車駅に存在しない場合があるのでリセットする
      setStationState((prev) => ({
        ...prev,
        wantedDestination: null,
        stations,
      }));

      setIsTrainTypeModalVisible(false);

      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    },
    [
      fetchedTrainTypes,
      navigation,
      setNavigationState,
      setStationState,
      stations,
    ]
  );

  const handleOpenQueryModal = useCallback(
    () => setIsFilterModalOpen(true),
    []
  );

  const hiddenIdPairs = useMemo(
    () =>
      queries
        .flatMap((q) => q.options)
        .filter((o) => !o.active)
        .map((o) => [o.parentId, o.id]),
    [queries]
  );

  const filteredTrainTypes = useMemo(
    () =>
      fetchedTrainTypes.filter(
        (tt) =>
          !hiddenIdPairs.some(([l, t]) =>
            tt.lines.some(
              (line) => line.id === l && line.trainType?.typeId === t
            )
          )
      ),
    [fetchedTrainTypes, hiddenIdPairs]
  );

  return (
    <View style={styles.root}>
      <Heading>{translate('trainTypeSettings')}</Heading>

      <View style={styles.listContainer}>
        <TrainTypeList data={filteredTrainTypes} onSelect={handleSelect} />
      </View>

      <FAB secondary onPress={handleOpenQueryModal} icon="options-outline" />
      <FAB onPress={onPressBack} icon="close" />

      <TrainTypeInfoModal
        visible={isTrainTypeModalVisible}
        trainType={selectedTrainType}
        stations={stations}
        loading={isLineGroupByIdLoading}
        error={byLineGroupIdFetchError}
        onConfirmed={handleTrainTypeConfirmed}
        onClose={() => setIsTrainTypeModalVisible(false)}
      />
      <FilterModal
        visible={isFilterModalOpen}
        queries={queries}
        onClose={() => setIsFilterModalOpen(false)}
        onQueryChange={(qid, opt) => {
          setQueries((prev) =>
            prev.map((q) =>
              q.id === qid
                ? {
                    ...q,
                    options: q.options.map((o) =>
                      o.id === opt.id ? { ...o, active: opt.active } : o
                    ),
                  }
                : q
            )
          );
        }}
      />
    </View>
  );
};

export default React.memo(TrainTypeSettings);
