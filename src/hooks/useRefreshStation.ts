import i18n from 'i18n-js';
import { useSelector, useDispatch } from 'react-redux';
import { Dispatch, useEffect, useCallback, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { getArrivedThreshold, getApproachingThreshold } from '../constants';
import { Station, Line } from '../models/StationAPI';
import { TrainLCDAppState } from '../store';
import calcStationDistances from '../utils/stationDistance';
import { StationActionTypes } from '../store/types/station';
import {
  updateScoredStations,
  updateArrived,
  updateApproaching,
  refreshNearestStation,
} from '../store/actions/station';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
  const dispatch = useDispatch<Dispatch<StationActionTypes>>();
  const { stations } = useSelector((state: TrainLCDAppState) => state.station);
  const { selectedLine } = useSelector((state: TrainLCDAppState) => state.line);
  const { coords } = useSelector(
    (state: TrainLCDAppState) => state.location.location
  );
  const { leftStations } = useSelector(
    (state: TrainLCDAppState) => state.navigation
  );
  const displayedNextStation = leftStations[1];
  const [approachingNotifiedId, setApproachingNotifiedId] = useState<string>();
  const [arrivedNotifiedId, setArrivedNotifiedId] = useState<string>();

  const { latitude, longitude } = coords;

  const sendApproachingNotification = useCallback(
    async (station: Station, notifyType: NotifyType) => {
      const approachingText =
        i18n.locale === 'ja'
          ? `まもなく、${station.name}駅です。`
          : `Arriving at ${station.nameR} station.`;
      const arrivedText =
        i18n.locale === 'ja'
          ? `ただいま、${station.name}駅に到着しました。`
          : `Now stopping at ${station.nameR} station.`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.locale === 'ja' ? 'お知らせ' : 'Announcement',
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
    dispatch(updateScoredStations(scoredStations));
    dispatch(updateArrived(arrived));
    dispatch(updateApproaching(approaching));
    if (approaching && nearestStation.id !== approachingNotifiedId) {
      sendApproachingNotification(nearestStation, 'APPROACHING');
      setApproachingNotifiedId(nearestStation.id);
    }
    if (arrived && nearestStation.id !== arrivedNotifiedId) {
      sendApproachingNotification(nearestStation, 'ARRIVING');
      dispatch(refreshNearestStation(nearestStation));
      setArrivedNotifiedId(nearestStation.id);
    }
  }, [
    approachingNotifiedId,
    arrivedNotifiedId,
    dispatch,
    displayedNextStation,
    latitude,
    longitude,
    selectedLine,
    sendApproachingNotification,
    stations,
  ]);
};

export default useRefreshStation;
