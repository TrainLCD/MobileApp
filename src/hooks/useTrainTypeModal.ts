import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Line, Station, TrainType } from '~/@types/graphql';
import {
  GET_LINE_GROUP_STATIONS,
  GET_STATION_TRAIN_TYPES_LIGHT,
} from '~/lib/graphql/queries';
import { findNearestStation } from '~/utils/findNearestStation';
import { resolveDirectionForNewStations } from '~/utils/resolveDirectionForNewStations';
import { beginSelection, isLatestSelection } from '~/utils/selectionGeneration';
import { selectedLineAtom } from '../store/atoms/line';
import navigationState, {
  fetchedTrainTypesAtom,
  trainTypeAtom,
} from '../store/atoms/navigation';
import { resetFirstSpeechAtom } from '../store/atoms/speech';
import stationState, {
  selectedBoundAtom,
  stationAtom,
} from '../store/atoms/station';
import { isJapanese } from '../translation';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useLazyGraphQLQuery } from './useLazyGraphQLQuery';

export const useTrainTypeModal = () => {
  const selectedBound = useAtomValue(selectedBoundAtom);
  const currentStation = useAtomValue(stationAtom);
  const setStationState = useSetAtom(stationState);
  const selectedLine = useAtomValue(selectedLineAtom);
  const fetchedTrainTypes = useAtomValue(fetchedTrainTypesAtom);
  const activeTrainType = useAtomValue(trainTypeAtom);
  const setNavigation = useSetAtom(navigationState);
  const setResetFirstSpeech = useSetAtom(resetFirstSpeechAtom);

  const currentLine = useCurrentLine();
  const currentStoppingStation = useCurrentStation(true);

  const [isSettingListModalOpen, setIsSettingListModalOpen] = useState(false);
  const [isTrainTypeModalVisible, setIsTrainTypeModalVisible] = useState(false);
  const pendingTrainTypeModalRef = useRef(false);

  const [fetchStationsByLineGroupId, { loading: trainTypeSelectLoading }] =
    useLazyGraphQLQuery<
      { lineGroupStations: Station[] },
      { lineGroupId: number }
    >(GET_LINE_GROUP_STATIONS);
  const [fetchTrainTypes, { loading: fetchTrainTypesLoading }] =
    useLazyGraphQLQuery<
      { stationTrainTypes: TrainType[] },
      { stationId: number }
    >(GET_STATION_TRAIN_TYPES_LIGHT);

  const trainTypeName = useMemo(
    () =>
      activeTrainType
        ? isJapanese
          ? (activeTrainType.name ?? '')
          : (activeTrainType.nameRoman ?? '')
        : undefined,
    [activeTrainType]
  );

  const trainTypeModalLine: Line | null = currentLine ?? selectedLine;

  const handleTrainTypeSelect = useCallback(
    async (trainType: TrainType) => {
      if (trainType.groupId == null) return;

      // 路線・プリセット選択とも世代を共有し、フックをまたいだ選択の割り込みでも
      // 古い取得結果が新しい選択を上書きしないようにする
      const generation = beginSelection();

      const res = await fetchStationsByLineGroupId({
        variables: { lineGroupId: trainType.groupId },
      });
      // 取得中に別の選択(種別・路線・プリセット)が行われていたら、この呼び出しの
      // 結果は破棄する(遅れて返った駅一覧が新しい選択の駅一覧・方向・終点を潰さないようにする)
      if (!isLatestSelection(generation)) return;
      if (!res.data?.lineGroupStations) return;
      const newStations = res.data.lineGroupStations;

      if (selectedBound) {
        // 大江戸線の都庁前(外回り/内回り)のようにgroupIdが同じでもidが異なる駅が
        // あるため、idで存在チェックする(groupId一致だと無関係な出現を現在駅と
        // 誤認し、findNearestStationによる位置補正がスキップされてしまう)。
        const currentInNewList = newStations.some(
          (s) => s.id === currentStation?.id
        );

        setStationState((prev) => {
          // 種別を変えると駅配列が別系統のものへ丸ごと入れ替わるため、
          // 旧系統基準の進行方向・終点をそのまま引き継ぐと、逆方向や別系統の
          // 終点(例: 常磐線快速へ変えたのに東海道線の沼津)が案内されてしまう。
          // 新しい駅配列の並びで方向を引き直し、終点もその方向の端の駅に揃える。
          const direction = resolveDirectionForNewStations(
            prev.stations,
            newStations,
            currentStation,
            prev.selectedDirection
          );
          const bound = direction
            ? ((direction === 'INBOUND'
                ? newStations[newStations.length - 1]
                : newStations[0]) ?? prev.selectedBound)
            : prev.selectedBound;

          if (currentInNewList) {
            return {
              ...prev,
              stations: newStations,
              selectedDirection: direction,
              selectedBound: bound,
            };
          }

          const nearest = findNearestStation(
            prev.stations,
            newStations,
            currentStation?.id,
            prev.selectedDirection
          );

          return {
            ...prev,
            stations: newStations,
            ...(nearest ? { station: nearest } : {}),
            selectedDirection: direction,
            selectedBound: bound,
          };
        });

        setNavigation((prev) => ({
          ...prev,
          trainType,
          leftStations: [],
        }));
        setResetFirstSpeech((prev) => prev + 1);
      } else {
        setStationState((prev) => ({
          ...prev,
          pendingStations: newStations,
        }));
        setNavigation((prev) => ({
          ...prev,
          pendingTrainType: trainType,
        }));
      }
    },
    [
      fetchStationsByLineGroupId,
      setStationState,
      setNavigation,
      setResetFirstSpeech,
      selectedBound,
      currentStation,
    ]
  );

  const openSettingListModal = useCallback(() => {
    setIsSettingListModalOpen(true);
  }, []);

  const closeSettingListModal = useCallback(() => {
    setIsSettingListModalOpen(false);
  }, []);

  const handleTrainTypePress = useCallback(() => {
    pendingTrainTypeModalRef.current = true;
    setIsSettingListModalOpen(false);
    if (currentStoppingStation?.id) {
      setNavigation((prev) => ({
        ...prev,
        fetchedTrainTypes: [],
      }));
      fetchTrainTypes({
        variables: { stationId: currentStoppingStation.id as number },
      }).then((res) => {
        setNavigation((prev) => ({
          ...prev,
          fetchedTrainTypes: res.data?.stationTrainTypes ?? [],
        }));
      });
    }
  }, [currentStoppingStation?.id, fetchTrainTypes, setNavigation]);

  const handleSettingListCloseAnimationEnd = useCallback(() => {
    if (pendingTrainTypeModalRef.current) {
      pendingTrainTypeModalRef.current = false;
      setIsTrainTypeModalVisible(true);
    }
  }, []);

  const closeTrainTypeModal = useCallback(() => {
    setIsTrainTypeModalVisible(false);
  }, []);

  const handleTrainTypeModalSelect = useCallback(
    (trainType: TrainType) => {
      setIsTrainTypeModalVisible(false);
      handleTrainTypeSelect(trainType);
    },
    [handleTrainTypeSelect]
  );

  return {
    isSettingListModalOpen,
    isTrainTypeModalVisible,
    trainTypeName,
    trainTypeColor: activeTrainType?.color ?? undefined,
    trainTypeSelectLoading,
    fetchTrainTypesLoading,
    trainTypeDisabled: fetchedTrainTypes.length <= 1,
    trainTypeModalLine,
    openSettingListModal,
    closeSettingListModal,
    handleTrainTypePress,
    handleSettingListCloseAnimationEnd,
    closeTrainTypeModal,
    handleTrainTypeModalSelect,
  };
};
