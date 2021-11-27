import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { getApproachingThreshold, getArrivedThreshold } from '../constants';
import { Line, Station } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import locationState from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getNextStation from '../utils/getNextStation';
import calcStationDistances from '../utils/stationDistance';

type NotifyType = 'ARRIVING' | 'APPROACHING';

const isArrived = (nearestStation: Station, currentLine: Line): boolean => {
  if (!nearestStation) {
    return false;
  }
  const ARRIVED_THRESHOLD = getArrivedThreshold(currentLine?.lineType);
  return nearestStation.distance < ARRIVED_THRESHOLD;
};

const isApproaching = (
  nextStation: Station,
  nearestStation: Station,
  currentLine: Line
): boolean => {
  if (!nextStation || !nearestStation) {
    return false;
  }
  const APPROACHING_THRESHOLD = getApproachingThreshold(currentLine?.lineType);
  // APPROACHING_THRESHOLD以上次の駅から離れている: つぎは
  // APPROACHING_THRESHOLDより近い: まもなく
  return (
    nearestStation.distance < APPROACHING_THRESHOLD &&
    nextStation.id === nearestStation.id
  );
};

const useRefreshStation = (): void => {
  const [{ station, stations }, setStation] = useRecoilState(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const setNavigation = useSetRecoilState(navigationState);
  const { location } = useRecoilValue(locationState);
  const { leftStations } = useRecoilValue(navigationState);
  const displayedNextStation = getNextStation(leftStations, station);
  const [approachingNotifiedId, setApproachingNotifiedId] = useState<number>();
  const [arrivedNotifiedId, setArrivedNotifiedId] = useState<number>();
  const { targetStationIds } = useRecoilValue(notifyState);

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
    if (!location) {
      return;
    }
    const { latitude, longitude } = location.coords;

    const scoredStations = calcStationDistances(stations, latitude, longitude);
    const nearestStation = scoredStations[0];
    const arrived = isArrived(nearestStation, selectedLine);
    const approaching = isApproaching(
      displayedNextStation,
      nearestStation,
      selectedLine
    );
    setStation((prev) => ({
      ...prev,
      scoredStations,
      arrived,
      approaching,
    }));

    const isNearestStationNotifyTarget = !!targetStationIds.find(
      (id) => id === nearestStation.id
    );

    if (isNearestStationNotifyTarget) {
      if (approaching && nearestStation.id !== approachingNotifiedId) {
        sendApproachingNotification(nearestStation, 'APPROACHING');
        setApproachingNotifiedId(nearestStation.id);
      }
      if (arrived && nearestStation.id !== arrivedNotifiedId) {
        sendApproachingNotification(nearestStation, 'ARRIVING');
        setArrivedNotifiedId(nearestStation.id);
      }
    }

    if (arrived) {
      setStation((prev) => ({
        ...prev,
        station: nearestStation,
      }));
      if (!nearestStation.pass) {
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
    selectedLine,
    sendApproachingNotification,
    setNavigation,
    setStation,
    stations,
    targetStationIds,
  ]);
};

export default useRefreshStation;
