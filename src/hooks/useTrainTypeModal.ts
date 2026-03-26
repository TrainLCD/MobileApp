import { useLazyQuery } from '@apollo/client/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Line, Station, TrainType } from '~/@types/graphql';
import {
  GET_LINE_GROUP_STATIONS,
  GET_STATION_TRAIN_TYPES_LIGHT,
} from '~/lib/graphql/queries';
import { findNearestStation } from '~/utils/findNearestStation';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import { resetFirstSpeechAtom } from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';

export const useTrainTypeModal = () => {
  const [
    { selectedBound, station: currentStation, selectedDirection },
    setStationState,
  ] = useAtom(stationState);
  const { selectedLine } = useAtomValue(lineState);
  const [{ fetchedTrainTypes, trainType: activeTrainType }, setNavigation] =
    useAtom(navigationState);
  const setResetFirstSpeech = useSetAtom(resetFirstSpeechAtom);

  const currentLine = useCurrentLine();
  const currentStoppingStation = useCurrentStation(true);

  const [isSettingListModalOpen, setIsSettingListModalOpen] = useState(false);
  const [isTrainTypeModalVisible, setIsTrainTypeModalVisible] = useState(false);
  const pendingTrainTypeModalRef = useRef(false);

  const [fetchStationsByLineGroupId, { loading: trainTypeSelectLoading }] =
    useLazyQuery<{ lineGroupStations: Station[] }, { lineGroupId: number }>(
      GET_LINE_GROUP_STATIONS
    );
  const [fetchTrainTypes, { loading: fetchTrainTypesLoading }] = useLazyQuery<
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
      const res = await fetchStationsByLineGroupId({
        variables: { lineGroupId: trainType.groupId },
      });
      if (!res.data?.lineGroupStations) return;
      const newStations = res.data.lineGroupStations;

      if (selectedBound) {
        const currentInNewList = newStations.some(
          (s) => s.groupId === currentStation?.groupId
        );

        setStationState((prev) => {
          if (currentInNewList) {
            return { ...prev, stations: newStations };
          }

          const nearest = findNearestStation(
            prev.stations,
            newStations,
            currentStation?.groupId,
            selectedDirection
          );

          return {
            ...prev,
            stations: newStations,
            ...(nearest ? { station: nearest } : {}),
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
      currentStation?.groupId,
      selectedDirection,
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
