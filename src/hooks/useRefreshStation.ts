import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Station } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import sendNotificationAsync from '../utils/native/sensitiveNotificationMoudle';
import {
  getApproachingThreshold,
  getArrivedThreshold,
} from '../utils/threshold';
import useAverageDistance from './useAverageDistance';
import useCanGoForward from './useCanGoForward';
import useCurrentLine from './useCurrentLine';
import useNextStation from './useNextStation';
import useSortedDistanceStations from './useSortedDistanceStations';
import useStationNumberIndexFunc from './useStationNumberIndexFunc';

type NotifyType = 'ARRIVED' | 'APPROACHING';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const useRefreshStation = (): void => {
  const [{ station, stations, selectedDirection }, setStation] =
    useRecoilState(stationState);
  const [{ leftStations }, setNavigation] = useRecoilState(navigationState);
  const displayedNextStation = station && getNextStation(leftStations, station);
  const nextStation = useNextStation(false);
  const [approachingNotifiedId, setApproachingNotifiedId] = useState<number>();
  const [arrivedNotifiedId, setArrivedNotifiedId] = useState<number>();
  const { targetStationIds } = useRecoilValue(notifyState);

  const sortedStations = useSortedDistanceStations();
  const currentLine = useCurrentLine();
  const canGoForward = useCanGoForward();
  const getStationNumberIndex = useStationNumberIndexFunc();

  const nearestStation = useMemo(() => sortedStations[0], [sortedStations]);
  const avgDistance = useAverageDistance();

  const isArrived = useMemo((): boolean => {
    if (!nearestStation) {
      return false;
    }
    const ARRIVED_THRESHOLD = getArrivedThreshold(
      currentLine?.lineType,
      avgDistance
    );
    return (nearestStation.distance || 0) < ARRIVED_THRESHOLD;
  }, [avgDistance, currentLine?.lineType, nearestStation]);

  const isApproaching = useMemo((): boolean => {
    if (!displayedNextStation || !nearestStation) {
      return false;
    }
    const APPROACHING_THRESHOLD = getApproachingThreshold(
      currentLine?.lineType,
      avgDistance
    );

    const nearestStationIndex = stations.findIndex(
      (s) => s.id === nearestStation.id
    );
    const nextStationIndex = stations.findIndex(
      (s) => s.id === displayedNextStation?.id
    );
    const isNearestStationAfterThanCurrentStop =
      selectedDirection === 'INBOUND'
        ? nearestStationIndex >= nextStationIndex
        : nearestStationIndex <= nextStationIndex;

    // APPROACHING_THRESHOLD以上次の駅から離れている: つぎは
    // APPROACHING_THRESHOLDより近い: まもなく
    return (
      (nearestStation.distance || 0) < APPROACHING_THRESHOLD &&
      isNearestStationAfterThanCurrentStop
    );
  }, [
    avgDistance,
    currentLine?.lineType,
    displayedNextStation,
    nearestStation,
    selectedDirection,
    stations,
  ]);

  const sendApproachingNotification = useCallback(
    async (s: Station, notifyType: NotifyType) => {
      const stationNumberIndex = getStationNumberIndex(s.stationNumbers);
      const stationNumber = s.stationNumbers[stationNumberIndex]?.stationNumber;
      const stationNumberMaybeEmpty = `${
        stationNumber ? `(${stationNumber})` : ''
      }`;
      const approachingText = isJapanese
        ? `まもなく、${s.name}${stationNumberMaybeEmpty}に到着します。`
        : `Arriving at ${s.nameR}${stationNumberMaybeEmpty}.`;
      const arrivedText = isJapanese
        ? `ただいま、${s.name}${stationNumberMaybeEmpty}に到着しました。`
        : `Now stopping at ${s.nameR}${stationNumberMaybeEmpty}.`;

      await sendNotificationAsync({
        title: isJapanese ? 'お知らせ' : 'Announcement',
        body: notifyType === 'APPROACHING' ? approachingText : arrivedText,
      });
    },
    [getStationNumberIndex]
  );

  useEffect(() => {
    if (!nearestStation || !canGoForward) {
      return;
    }

    // 駅に接近中であり、かつ最寄り駅が次の駅ではない場合
    // 接近状態はヘッダーに出ないだけで計算はされている
    if (
      isApproaching &&
      !isArrived &&
      nearestStation.groupId !== nextStation?.groupId
    ) {
      const nearestStationIndex = stations.findIndex(
        (s) => s.groupId === nearestStation.groupId
      );

      // 現在の駅を地理的な最寄り駅の前の駅に設定する
      switch (selectedDirection) {
        case 'INBOUND': {
          const actualPrevStation = stations[nearestStationIndex + 1];
          if (actualPrevStation) {
            // 通過する場合でも現在の駅を通過する駅の前の駅に修正する
            setStation((prev) => ({
              ...prev,
              station:
                prev.station?.groupId !== actualPrevStation.groupId
                  ? actualPrevStation
                  : prev.station,
            }));
            // 通過しない場合ヘッダーも更新する
            if (!getIsPass(nearestStation)) {
              setNavigation((prev) => ({
                ...prev,
                stationForHeader:
                  prev.stationForHeader?.groupId !== actualPrevStation.groupId
                    ? actualPrevStation
                    : prev.stationForHeader,
              }));
            }
          }
          break;
        }
        case 'OUTBOUND': {
          const actualPrevStation = stations[nearestStationIndex - 1];
          if (actualPrevStation) {
            // 通過する場合でも現在の駅を通過する駅の前の駅に修正する
            setStation((prev) => ({
              ...prev,
              station:
                prev.station?.groupId !== actualPrevStation.groupId
                  ? actualPrevStation
                  : prev.station,
            }));
            // 通過しない場合ヘッダーも更新する
            if (!getIsPass(nearestStation)) {
              setNavigation((prev) => ({
                ...prev,
                stationForHeader:
                  prev.stationForHeader?.groupId !== actualPrevStation.groupId
                    ? actualPrevStation
                    : prev.stationForHeader,
              }));
            }
          }
          break;
        }
        default:
          break;
      }
    }

    setStation((prev) => ({
      ...prev,
      sortedStations,
      arrived: isArrived,
      approaching: isApproaching,
    }));

    const isNearestStationNotifyTarget = !!targetStationIds.find(
      (id) => id === nearestStation?.id
    );

    if (isNearestStationNotifyTarget) {
      if (isApproaching && nearestStation?.id !== approachingNotifiedId) {
        sendApproachingNotification(nearestStation, 'APPROACHING');
        setApproachingNotifiedId(nearestStation?.id);
      }
      if (isArrived && nearestStation?.id !== arrivedNotifiedId) {
        sendApproachingNotification(nearestStation, 'ARRIVED');
        setArrivedNotifiedId(nearestStation?.id);
      }
    }

    if (isArrived) {
      setStation((prev) => ({
        ...prev,
        station:
          prev.station?.groupId !== nearestStation.groupId
            ? nearestStation
            : prev.station,
      }));
      if (!getIsPass(nearestStation)) {
        setNavigation((prev) => ({
          ...prev,
          stationForHeader:
            prev.stationForHeader?.groupId !== nearestStation.groupId
              ? nearestStation
              : prev.stationForHeader,
        }));
      }
    }
  }, [
    approachingNotifiedId,
    arrivedNotifiedId,
    canGoForward,
    isApproaching,
    isArrived,
    nearestStation,
    nextStation?.groupId,
    selectedDirection,
    sendApproachingNotification,
    setNavigation,
    setStation,
    sortedStations,
    stations,
    targetStationIds,
  ]);
};

export default useRefreshStation;
