import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import type { Station } from '~/@types/graphql';
import { ASYNC_STORAGE_KEYS, LOCATION_TASK_NAME } from '../constants';
import { locationAtom, setLocation } from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { translate } from '../translation';
import { useFetchCurrentLocationOnce } from './useFetchCurrentLocationOnce';
import { useFetchNearbyStation } from './useFetchNearbyStation';

const INITIAL_LOCATION_FALLBACK_DELAY_MS = 800;

export type UseInitialNearbyStationResult = {
  station: Station | null;
  nearbyStationLoading: boolean;
};

export const useInitialNearbyStation = (): UseInitialNearbyStationResult => {
  const [stationAtomState, setStationState] = useAtom(stationState);
  const setNavigationState = useSetAtom(navigationState);
  const location = useAtomValue(locationAtom);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;

  const { station: stationFromAtom } = stationAtomState;
  const initialNearbyFetchInFlightRef = useRef(false);

  const {
    stations: nearbyStations,
    fetchByCoords,
    isLoading: nearbyStationLoading,
    error: nearbyStationFetchError,
  } = useFetchNearbyStation();

  const { fetchCurrentLocation } = useFetchCurrentLocationOnce();

  const station = useMemo(
    () => stationFromAtom ?? nearbyStations[0] ?? null,
    [stationFromAtom, nearbyStations]
  );

  // バックグラウンド位置更新を停止
  useEffect(() => {
    const stopLocationUpdates = async () => {
      const hasStartedLocationUpdates =
        await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStartedLocationUpdates) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    };
    stopLocationUpdates();
  }, []);

  // 最寄り駅の取得
  useEffect(() => {
    const fetchInitialNearbyStationAsync = async (coords?: {
      latitude: number;
      longitude: number;
    }) => {
      if (station || initialNearbyFetchInFlightRef.current) return;
      initialNearbyFetchInFlightRef.current = true;

      try {
        let requestCoords = coords;
        if (!requestCoords) {
          const currentLocation = await fetchCurrentLocation(true);
          if (!currentLocation) return;
          setLocation(currentLocation);
          requestCoords = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          };
        }

        const data = await fetchByCoords({
          latitude: requestCoords.latitude,
          longitude: requestCoords.longitude,
          limit: 1,
        });

        const stationFromAPI = data.data?.stationsNearby[0] ?? null;
        setStationState((prev) => ({
          ...prev,
          station: stationFromAPI,
        }));
        setNavigationState((prev) => ({
          ...prev,
          stationForHeader: stationFromAPI,
        }));
      } catch (error) {
        console.error(error);
      } finally {
        initialNearbyFetchInFlightRef.current = false;
      }
    };

    if (latitude != null && longitude != null) {
      fetchInitialNearbyStationAsync({ latitude, longitude });
      return;
    }

    const fallbackTimerId = setTimeout(() => {
      fetchInitialNearbyStationAsync();
    }, INITIAL_LOCATION_FALLBACK_DELAY_MS);

    return () => {
      clearTimeout(fallbackTimerId);
    };
  }, [
    fetchByCoords,
    fetchCurrentLocation,
    latitude,
    longitude,
    setNavigationState,
    setStationState,
    station,
  ]);

  // 初回起動アラート
  useEffect(() => {
    const checkFirstLaunch = async () => {
      const firstLaunchPassed = await AsyncStorage.getItem(
        ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED
      );
      if (firstLaunchPassed === null) {
        Alert.alert(translate('notice'), translate('firstAlertText'), [
          {
            text: 'OK',
            onPress: (): void => {
              AsyncStorage.setItem(
                ASYNC_STORAGE_KEYS.FIRST_LAUNCH_PASSED,
                'true'
              );
            },
          },
        ]);
      }
    };
    checkFirstLaunch();
  }, []);

  // 最寄り駅取得エラーのアラート
  useEffect(() => {
    if (nearbyStationFetchError) {
      console.error(nearbyStationFetchError);
      Alert.alert(translate('errorTitle'), translate('apiErrorText'));
    }
  }, [nearbyStationFetchError]);

  return { station, nearbyStationLoading };
};
