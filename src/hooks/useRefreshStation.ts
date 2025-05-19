import * as Notifications from 'expo-notifications';
import isPointWithinRadius from 'geolib/es/isPointWithinRadius';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { ARRIVED_GRACE_PERIOD_MS } from '~/constants';
import type { Station } from '../../gen/proto/stationapi_pb';
import {
  ARRIVED_MAXIMUM_SPEED,
  BAD_ACCURACY_THRESHOLD,
} from '../constants/threshold';
import navigationState from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getIsPass from '../utils/isPass';
import sendNotificationAsync from '../utils/native/ios/sensitiveNotificationMoudle';
import useCanGoForward from './useCanGoForward';
import { useLocationStore } from './useLocationStore';
import { useNearestStation } from './useNearestStation';
import { useNextStation } from './useNextStation';
import useStationNumberIndexFunc from './useStationNumberIndexFunc';
import { useThreshold } from './useThreshold';

type NotifyType = 'ARRIVED' | 'APPROACHING';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const useRefreshStation = (): void => {
  const setStation = useSetRecoilState(stationState);
  const setNavigation = useSetRecoilState(navigationState);
  const latitude = useLocationStore((state) => state?.coords.latitude);
  const longitude = useLocationStore((state) => state?.coords.longitude);
  const speed = useLocationStore((state) => state?.coords.speed);
  const accuracy = useLocationStore((state) => state?.coords.accuracy);

  const nextStation = useNextStation();
  const approachingNotifiedIdRef = useRef<number>();
  const arrivedNotifiedIdRef = useRef<number>();
  const lastArrivedTimeRef = useRef<number>(0);
  const { targetStationIds } = useRecoilValue(notifyState);

  const nearestStation = useNearestStation();
  const canGoForward = useCanGoForward();
  const getStationNumberIndex = useStationNumberIndexFunc();
  const { arrivedThreshold, approachingThreshold } = useThreshold();

  const isArrived = useMemo((): boolean => {
    const inGracePeriod =
      Date.now() - lastArrivedTimeRef.current < ARRIVED_GRACE_PERIOD_MS;

    if (!latitude || !longitude || !nearestStation || inGracePeriod) {
      return true;
    }

    if (getIsPass(nearestStation)) {
      return isPointWithinRadius(
        { latitude, longitude },
        {
          latitude: nearestStation.latitude,
          longitude: nearestStation.longitude,
        },
        arrivedThreshold
      );
    }

    const arrived =
      // NOTE: 位置情報が取得できない or 位置情報の取得誤差が200m以上ある場合は走行速度を停車判定に使用しない
      !accuracy || (accuracy && accuracy >= BAD_ACCURACY_THRESHOLD)
        ? isPointWithinRadius(
            { latitude, longitude },
            {
              latitude: nearestStation.latitude,
              longitude: nearestStation.longitude,
            },
            arrivedThreshold
          )
        : isPointWithinRadius(
            { latitude, longitude },
            {
              latitude: nearestStation.latitude,
              longitude: nearestStation.longitude,
            },
            arrivedThreshold
          ) && (speed * 3600) / 1000 < ARRIVED_MAXIMUM_SPEED; // NOTE: 走行速度が一定以上の場合は停車判定に使用しない

    if (arrived) {
      lastArrivedTimeRef.current = Date.now();
    }
    return arrived;
  }, [accuracy, arrivedThreshold, latitude, longitude, nearestStation, speed]);

  const isApproaching = useMemo((): boolean => {
    if (!latitude || !longitude || !nextStation) {
      return false;
    }

    return isPointWithinRadius(
      { latitude, longitude },
      {
        latitude: nextStation.latitude,
        longitude: nextStation.longitude,
      },
      approachingThreshold
    );
  }, [approachingThreshold, latitude, longitude, nextStation]);

  const sendApproachingNotification = useCallback(
    async (s: Station, notifyType: NotifyType) => {
      const stationNumberIndex = getStationNumberIndex(s);
      const stationNumber = s.stationNumbers[stationNumberIndex]?.stationNumber;
      const stationNumberMaybeEmpty = `${
        stationNumber ? `(${stationNumber})` : ''
      }`;
      const approachingText = isJapanese
        ? `まもなく、${s.name}${stationNumberMaybeEmpty}に到着します。`
        : `Arriving at ${s.nameRoman}${stationNumberMaybeEmpty}.`;
      const arrivedText = isJapanese
        ? `ただいま、${s.name}${stationNumberMaybeEmpty}に到着しました。`
        : `Now stopping at ${s.nameRoman}${stationNumberMaybeEmpty}.`;

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

    const isNearestStationNotifyTarget = !!targetStationIds.find(
      (id) => id === nearestStation.id
    );

    if (isNearestStationNotifyTarget) {
      if (
        isApproaching &&
        nearestStation.id !== approachingNotifiedIdRef.current
      ) {
        sendApproachingNotification(nearestStation, 'APPROACHING');
        approachingNotifiedIdRef.current = nearestStation.id;
      }
      if (isArrived && nearestStation.id !== arrivedNotifiedIdRef.current) {
        sendApproachingNotification(nearestStation, 'ARRIVED');
        arrivedNotifiedIdRef.current = nearestStation.id;
      }
    }
  }, [
    canGoForward,
    isApproaching,
    isArrived,
    nearestStation,
    sendApproachingNotification,
    targetStationIds,
  ]);

  useEffect(() => {
    if (!nearestStation) {
      return;
    }

    setStation((prev) => ({
      ...prev,
      approaching: isApproaching,
      arrived: isArrived,
      station:
        isArrived && prev.station?.id !== nearestStation.id
          ? nearestStation
          : prev.station,
    }));

    if (isArrived && !getIsPass(nearestStation)) {
      setNavigation((prev) => ({
        ...prev,
        stationForHeader:
          prev.stationForHeader?.id !== nearestStation.id
            ? nearestStation
            : prev.stationForHeader,
      }));
    }
  }, [isApproaching, isArrived, nearestStation, setNavigation, setStation]);
};

export default useRefreshStation;
