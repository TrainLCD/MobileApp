import { useEffect, useCallback, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { LocationObject } from 'expo-location';
import { getArrivedThreshold, getApproachingThreshold } from '../constants';
import { Station, Line } from '../models/StationAPI';
import calcStationDistances from '../utils/stationDistance';
import { isJapanese } from '../translation';
import stationState from '../store/atoms/station';
import lineState from '../store/atoms/line';
import locationState from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import { HMSLocationObject } from '../models/HMSLocationObject';

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
  const setStation = useSetRecoilState(stationState);
  const { stations } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { location } = useRecoilValue(locationState);
  const { leftStations } = useRecoilValue(navigationState);
  const displayedNextStation = leftStations[1];
  const [approachingNotifiedId, setApproachingNotifiedId] = useState<number>();
  const [arrivedNotifiedId, setArrivedNotifiedId] = useState<number>();
  const { targetStationIds } = useRecoilValue(notifyState);

  const coords =
    (location as LocationObject)?.coords || (location as HMSLocationObject);

  const { latitude, longitude } = coords;

  const sendApproachingNotification = useCallback(
    async (station: Station, notifyType: NotifyType) => {
      const approachingText = isJapanese
        ? `まもなく、${station.name}駅です。`
        : `Arriving at ${station.nameR} station.`;
      const arrivedText = isJapanese
        ? `ただいま、${station.name}駅に到着しました。`
        : `Now stopping at ${station.nameR} station.`;

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
    }
  }, [
    approachingNotifiedId,
    arrivedNotifiedId,
    displayedNextStation,
    latitude,
    longitude,
    selectedLine,
    sendApproachingNotification,
    setStation,
    stations,
    targetStationIds,
  ]);
};

export default useRefreshStation;
