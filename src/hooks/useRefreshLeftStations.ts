import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getCurrentStationIndex from '../utils/currentStationIndex';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getIsPass from '../utils/isPass';
import { getIsLocal } from '../utils/trainTypeString';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useLoopLine } from './useLoopLine';
import { useThemeStore } from './useThemeStore';

export const useRefreshLeftStations = (): void => {
  const setNavigation = useSetAtom(navigationState);
  const {
    station: normalStation,
    stations: normalStations,
    selectedDirection,
  } = useAtomValue(stationState);

  const theme = useThemeStore();
  const currentLine = useCurrentLine();
  const trainType = useCurrentTrainType();
  const { isOsakaLoopLine, isYamanoteLine, isMeijoLine } = useLoopLine();

  const stations = useMemo(
    () =>
      dropEitherJunctionStation(
        theme === APP_THEME.JR_WEST || theme === APP_THEME.LED
          ? normalStations.filter((s) => !getIsPass(s))
          : normalStations,
        selectedDirection
      ),
    [normalStations, selectedDirection, theme]
  );
  const station = useMemo(() => {
    // JRWもしくはLEDテーマでは通過駅を表示しないので、
    // 通過駅を通過する際に駅情報のアプデを行わない
    if (
      (theme === APP_THEME.JR_WEST || theme === APP_THEME.LED) &&
      getIsPass(normalStation)
    ) {
      const stations =
        selectedDirection === 'INBOUND'
          ? normalStations.slice().reverse()
          : normalStations;

      const normalStationIndex = stations.findIndex(
        (s) => s.groupId === normalStation?.groupId
      );
      const lastStoppedStation = stations.find(
        (s, i) => !getIsPass(s) && normalStationIndex <= i
      );
      return lastStoppedStation;
    }
    return normalStation;
  }, [normalStation, normalStations, theme, selectedDirection]);

  const getStationsForLoopLine = useCallback(
    (currentStationIndex: number): Station[] => {
      if (!currentLine) {
        return [];
      }

      switch (selectedDirection) {
        case 'INBOUND': {
          if (currentStationIndex === 0) {
            // 山手線は折り返す
            return [stations[0], ...stations.slice().reverse().slice(0, 7)];
          }

          // 環状線表示駅残り少ない
          const inboundPendingStations = stations
            .slice(
              currentStationIndex - 7 > 0 ? currentStationIndex - 7 : 0,
              currentStationIndex + 1
            )
            .reverse();

          if (currentStationIndex < 7 || isMeijoLine) {
            const nextStations = stations
              .slice()
              .reverse()
              .slice(0, -(inboundPendingStations.length - 8));
            return [...inboundPendingStations, ...nextStations];
          }
          return inboundPendingStations;
        }
        case 'OUTBOUND': {
          // 環状線折返し駅
          if (currentStationIndex === stations.length - 1) {
            // 山手線は折り返す
            return [stations[currentStationIndex], ...stations.slice(0, 7)];
          }

          const outboundPendingStationCount =
            stations.length - currentStationIndex - 1;
          // 環状線表示駅残り少ない
          if (outboundPendingStationCount < 7) {
            return [
              ...stations.slice(currentStationIndex),
              ...stations.slice(0, 7 - outboundPendingStationCount),
            ];
          }

          return stations.slice(currentStationIndex, currentStationIndex + 8);
        }
        default:
          return [];
      }
    },
    [currentLine, isMeijoLine, selectedDirection, stations]
  );

  const getStations = useCallback(
    (currentStationIndex: number): Station[] => {
      switch (selectedDirection) {
        case 'INBOUND': {
          const slicedStations = stations.slice(
            currentStationIndex,
            stations.length
          );

          if (slicedStations.length < 8 && stations.length > 8) {
            return stations.slice(stations.length - 8, stations.length);
          }
          return slicedStations;
        }
        case 'OUTBOUND': {
          if (currentStationIndex === stations.length) {
            return stations.slice(currentStationIndex > 7 ? 7 : 0, 7).reverse();
          }

          const slicedStations = stations
            .slice(0, currentStationIndex + 1)
            .reverse();

          if (slicedStations.length < 8) {
            return stations.slice(0, 8).reverse();
          }
          return slicedStations;
        }
        default:
          return [];
      }
    },
    [selectedDirection, stations]
  );

  const loopLine = useMemo(() => {
    if (!currentLine) {
      return false;
    }

    if (isOsakaLoopLine && !getIsLocal(trainType)) {
      return false;
    }
    return isYamanoteLine || isOsakaLoopLine || isMeijoLine;
  }, [currentLine, isMeijoLine, isOsakaLoopLine, isYamanoteLine, trainType]);

  useEffect(() => {
    if (!station) {
      return;
    }
    const currentIndex = getCurrentStationIndex(stations, station);
    if (currentIndex === -1) {
      return;
    }
    const leftStations =
      loopLine && getIsLocal(trainType)
        ? getStationsForLoopLine(currentIndex)
        : getStations(currentIndex);
    setNavigation((prev) => ({
      ...prev,
      leftStations:
        leftStations[0]?.groupId !== prev.leftStations[0]?.groupId
          ? leftStations
          : prev.leftStations,
    }));
  }, [
    getStations,
    getStationsForLoopLine,
    loopLine,
    setNavigation,
    station,
    stations,
    trainType,
  ]);
};
