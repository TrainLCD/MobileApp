import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Vibration } from 'react-native';
import { useRecoilState, useRecoilValue } from 'recoil';
import { LineType, Station } from '../models/StationAPI';
import AppTheme from '../models/Theme';
import lineState from '../store/atoms/line';
import locationState from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import {
  getAvgStationBetweenDistances,
  scoreStationDistances,
} from '../utils/stationDistance';
import {
  getApproachingThreshold,
  getArrivedThreshold,
} from '../utils/threshold';

type NotifyType = 'ARRIVING' | 'APPROACHING';

const useRefreshStation = (): void => {
  const [{ station, stations, selectedBound, selectedDirection }, setStation] =
    useRecoilState(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { location } = useRecoilValue(locationState);
  const [{ leftStations }, setNavigation] = useRecoilState(navigationState);
  const displayedNextStation = getNextStation(leftStations, station);
  const [approachingNotifiedId, setApproachingNotifiedId] = useState<number>();
  const [arrivedNotifiedId, setArrivedNotifiedId] = useState<number>();
  const { targetStationIds } = useRecoilValue(notifyState);

  const isArrived = useCallback(
    (nearestStation: Station, avgDistance: number): boolean => {
      if (!nearestStation) {
        return false;
      }
      const ARRIVED_THRESHOLD = getArrivedThreshold(
        selectedLine?.lineType,
        avgDistance
      );
      return (nearestStation.distance || 0) < ARRIVED_THRESHOLD;
    },
    [selectedLine?.lineType]
  );

  const isApproaching = useCallback(
    (nearestStation: Station, avgDistance: number): boolean => {
      if (!displayedNextStation || !nearestStation) {
        return false;
      }
      const APPROACHING_THRESHOLD = getApproachingThreshold(
        selectedLine?.lineType,
        avgDistance
      );
      // 一番近い駅が通過駅で、次の駅が停車駅の場合、
      // 一番近い駅に到着（通過）した時点でまもなく扱いにする
      const isNextStationIsNextStop =
        displayedNextStation?.id !== nearestStation.id &&
        getIsPass(nearestStation) &&
        !getIsPass(displayedNextStation);
      if (
        isNextStationIsNextStop &&
        selectedLine?.lineType !== LineType.BulletTrain
      ) {
        return true;
      }

      const nearestStationIndex = stations.findIndex(
        (s) => s.id === nearestStation.id
      );
      const nextStationIndex = stations.findIndex(
        (s) => s.id === displayedNextStation?.id
      );
      const isNearestStationLaterThanCurrentStop =
        selectedDirection === 'INBOUND'
          ? nearestStationIndex >= nextStationIndex
          : nearestStationIndex <= nextStationIndex;

      // APPROACHING_THRESHOLD以上次の駅から離れている: つぎは
      // APPROACHING_THRESHOLDより近い: まもなく
      return (
        (nearestStation.distance || 0) < APPROACHING_THRESHOLD &&
        isNearestStationLaterThanCurrentStop
      );
    },
    [displayedNextStation, selectedDirection, selectedLine?.lineType, stations]
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        Vibration.vibrate();
        Alert.alert(
          notification.request.content.title || '',
          notification.request.content.body || ''
        );
      }
    );
    return () => subscription.remove();
  }, []);

  const sendApproachingNotification = useCallback(
    async (s: Station, notifyType: NotifyType) => {
      const approachingText = isJapanese
        ? `まもなく、${s.name}駅です。`
        : `Arriving at ${s.nameR} station.`;
      const arrivedText = isJapanese
        ? `ただいま、${s.name}駅に到着しました。`
        : `Now stopping at ${s.nameR} station.`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: isJapanese ? 'お知らせ' : 'Announcement',
          body: notifyType === 'APPROACHING' ? approachingText : arrivedText,
          sound: true,
        },
        trigger: null,
      });
    },
    []
  );

  useEffect(() => {
    if (!location || !selectedBound) {
      return;
    }
    const { latitude, longitude } = location.coords;

    const scoredStations = scoreStationDistances(stations, latitude, longitude);
    const nearestStation = scoredStations[0];
    const avg = getAvgStationBetweenDistances(stations);
    const arrived =
      theme === AppTheme.JRWest
        ? !getIsPass(nearestStation) && isArrived(nearestStation, avg)
        : isArrived(nearestStation, avg);
    const approaching = isApproaching(nearestStation, avg);

    setStation((prev) => ({
      ...prev,
      scoredStations,
      arrived,
      approaching,
    }));

    const isNearestStationNotifyTarget = !!targetStationIds.find(
      (id) => id === nearestStation?.id
    );

    if (isNearestStationNotifyTarget) {
      if (approaching && nearestStation?.id !== approachingNotifiedId) {
        sendApproachingNotification(nearestStation, 'APPROACHING');
        setApproachingNotifiedId(nearestStation?.id);
      }
      if (arrived && nearestStation?.id !== arrivedNotifiedId) {
        sendApproachingNotification(nearestStation, 'ARRIVING');
        setArrivedNotifiedId(nearestStation?.id);
      }
    }

    if (arrived) {
      if (theme !== AppTheme.JRWest) {
        setStation((prev) => ({
          ...prev,
          station: nearestStation,
        }));
      }
      if (theme === AppTheme.JRWest && !getIsPass(nearestStation)) {
        setStation((prev) => ({
          ...prev,
          station: nearestStation,
        }));
      }
      if (!getIsPass(nearestStation)) {
        setNavigation((prev) => ({
          ...prev,
          stationForHeader: nearestStation,
        }));
      }
    }
  }, [
    approachingNotifiedId,
    arrivedNotifiedId,
    isApproaching,
    isArrived,
    location,
    selectedBound,
    sendApproachingNotification,
    setNavigation,
    setStation,
    stations,
    targetStationIds,
  ]);
};

export default useRefreshStation;
