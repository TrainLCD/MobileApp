import * as Notifications from 'expo-notifications';
import isPointWithinRadius from 'geolib/es/isPointWithinRadius';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Station } from '~/@types/graphql';
import { ARRIVED_GRACE_PERIOD_MS } from '~/constants';
import { locationAtom } from '~/store/atoms/location';
import navigationState from '../store/atoms/navigation';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getIsPass from '../utils/isPass';
import sendNotificationAsync from '../utils/native/ios/sensitiveNotificationMoudle';
import { useCanGoForward } from './useCanGoForward';
import { useNearestStation } from './useNearestStation';
import { useNextStation } from './useNextStation';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';
import { useThreshold } from './useThreshold';

type NotifyType = 'ARRIVED' | 'APPROACHING';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useRefreshStation = (): void => {
  const setStation = useSetAtom(stationState);
  const setNavigation = useSetAtom(navigationState);
  const location = useAtomValue(locationAtom);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;

  const nextStation = useNextStation();
  const approachingNotifiedIdRef = useRef<number | null>(null);
  const arrivedNotifiedIdRef = useRef<number | null>(null);
  const lastArrivedTimeRef = useRef<number>(0);
  const { targetStationIds } = useAtomValue(notifyState);

  const nearestStation = useNearestStation();
  const canGoForward = useCanGoForward();
  const getStationNumberIndex = useStationNumberIndexFunc();
  const { arrivedThreshold, approachingThreshold } =
    useThreshold(nearestStation);

  const isArrived = useMemo((): boolean => {
    const inGracePeriod =
      Date.now() - lastArrivedTimeRef.current < ARRIVED_GRACE_PERIOD_MS;

    if (
      latitude == null ||
      longitude == null ||
      !nearestStation ||
      inGracePeriod
    ) {
      return true;
    }

    if (nearestStation.latitude == null || nearestStation.longitude == null) {
      return true;
    }

    const arrived = isPointWithinRadius(
      { latitude, longitude },
      {
        latitude: nearestStation.latitude as number,
        longitude: nearestStation.longitude as number,
      },
      arrivedThreshold
    );

    if (arrived) {
      lastArrivedTimeRef.current = Date.now();
    }
    return arrived;
  }, [arrivedThreshold, latitude, longitude, nearestStation]);

  const isApproaching = useMemo((): boolean => {
    if (
      latitude == null ||
      longitude == null ||
      nextStation == null ||
      nextStation.latitude == null ||
      nextStation.longitude == null
    ) {
      return false;
    }

    return isPointWithinRadius(
      { latitude, longitude },
      {
        latitude: nextStation.latitude as number,
        longitude: nextStation.longitude as number,
      },
      approachingThreshold
    );
  }, [approachingThreshold, latitude, longitude, nextStation]);

  const sendApproachingNotification = useCallback(
    async (s: Station, notifyType: NotifyType) => {
      const stationNumberIndex = getStationNumberIndex(s);
      const stationNumber =
        s.stationNumbers?.[stationNumberIndex]?.stationNumber;
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
        nearestStation.id !== undefined &&
        nearestStation.id !== approachingNotifiedIdRef.current
      ) {
        sendApproachingNotification(nearestStation, 'APPROACHING');
        approachingNotifiedIdRef.current = nearestStation.id ?? null;
      }
      if (
        isArrived &&
        nearestStation.id !== undefined &&
        nearestStation.id !== arrivedNotifiedIdRef.current
      ) {
        sendApproachingNotification(nearestStation, 'ARRIVED');
        arrivedNotifiedIdRef.current = nearestStation.id ?? null;
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
      approaching: !isArrived && !getIsPass(nearestStation) && isApproaching,
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
