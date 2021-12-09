import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Vibration } from 'react-native';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Line, Station } from '../models/StationAPI';
import AppTheme from '../models/Theme';
import lineState from '../store/atoms/line';
import locationState from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import { isJapanese } from '../translation';
import getNextStation from '../utils/getNextStation';
import {
  getAvgStationBetweenDistances,
  scoreStationDistances,
} from '../utils/stationDistance';
import {
  getApproachingThreshold,
  getArrivedThreshold,
} from '../utils/threshold';

type NotifyType = 'ARRIVING' | 'APPROACHING';

const isArrived = (
  nearestStation: Station,
  currentLine: Line,
  avgDistance: number
): boolean => {
  if (!nearestStation) {
    return false;
  }
  const ARRIVED_THRESHOLD = getArrivedThreshold(
    currentLine?.lineType,
    avgDistance
  );
  return nearestStation.distance < ARRIVED_THRESHOLD;
};

const isApproaching = (
  nextStation: Station,
  nearestStation: Station,
  currentLine: Line,
  avgDistance: number
): boolean => {
  if (!nextStation || !nearestStation) {
    return false;
  }
  const APPROACHING_THRESHOLD = getApproachingThreshold(
    currentLine?.lineType,
    avgDistance
  );
  // 一番近い駅が通過駅で、次の駅が停車駅の場合、
  // 一番近い駅に到着（通過）した時点でまもなく扱いにする
  const isNextStationIsNextStop =
    nextStation.id !== nearestStation.id &&
    nearestStation.pass &&
    !nextStation.pass;
  if (isNextStationIsNextStop) {
    return true;
  }

  // APPROACHING_THRESHOLD以上次の駅から離れている: つぎは
  // APPROACHING_THRESHOLDより近い: まもなく
  return (
    nearestStation.distance < APPROACHING_THRESHOLD &&
    nextStation.id === nearestStation.id
  );
};

const useRefreshStation = (): void => {
  const [{ station, stations, selectedBound }, setStation] =
    useRecoilState(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { location } = useRecoilValue(locationState);
  const [{ leftStations }, setNavigation] = useRecoilState(navigationState);
  const displayedNextStation = getNextStation(leftStations, station);
  const [approachingNotifiedId, setApproachingNotifiedId] = useState<number>();
  const [arrivedNotifiedId, setArrivedNotifiedId] = useState<number>();
  const { targetStationIds } = useRecoilValue(notifyState);
  const { theme } = useRecoilValue(themeState);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        Vibration.vibrate();
        Alert.alert(
          notification.request.content.title,
          notification.request.content.body
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
        ? !nearestStation?.pass && isArrived(nearestStation, selectedLine, avg)
        : isArrived(nearestStation, selectedLine, avg);
    const approaching = isApproaching(
      displayedNextStation,
      nearestStation,
      selectedLine,
      avg
    );
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
      if (theme === AppTheme.JRWest && !nearestStation?.pass) {
        setStation((prev) => ({
          ...prev,
          station: nearestStation,
        }));
      }
      if (!nearestStation?.pass) {
        setNavigation((prev) => ({
          ...prev,
          stationForHeader: nearestStation,
        }));
      }
    }
  }, [
    approachingNotifiedId,
    arrivedNotifiedId,
    displayedNextStation,
    location,
    selectedBound,
    selectedLine,
    sendApproachingNotification,
    setNavigation,
    setStation,
    stations,
    targetStationIds,
    theme,
  ]);
};

export default useRefreshStation;
