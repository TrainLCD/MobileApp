import * as Location from 'expo-location';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Station } from '~/@types/graphql';
import { LOCATION_TASK_NAME, STORAGE_KEYS } from '../constants';
import { storage } from '../lib/storage';
import { locationAtom, setLocation } from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import stationState, { stationAtom } from '../store/atoms/station';
import { translate } from '../translation';
import { showDialogWhilePresenting } from '../utils/dialogPresentation';
import { useFetchCurrentLocationOnce } from './useFetchCurrentLocationOnce';
import { useFetchNearbyStation } from './useFetchNearbyStation';

const INITIAL_LOCATION_FALLBACK_DELAY_MS = 800;

export type UseInitialNearbyStationResult = {
  station: Station | null;
  nearbyStationLoading: boolean;
  refetch: () => Promise<void>;
};

export const useInitialNearbyStation = (): UseInitialNearbyStationResult => {
  const stationFromAtom = useAtomValue(stationAtom);
  const setStationState = useSetAtom(stationState);
  const setNavigationState = useSetAtom(navigationState);
  const location = useAtomValue(locationAtom);
  const latitude = location?.coords.latitude;
  const longitude = location?.coords.longitude;

  const fetchInFlightRef = useRef(false);

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

  // 位置情報から最寄り駅を取得し atom を更新する共通処理
  const fetchNearbyAndUpdate = useCallback(
    async (coords?: { latitude: number; longitude: number }) => {
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
    },
    [fetchByCoords, fetchCurrentLocation, setNavigationState, setStationState]
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
      if (station || fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;

      try {
        await fetchNearbyAndUpdate(coords);
      } catch (error) {
        console.error(error);
      } finally {
        fetchInFlightRef.current = false;
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
  }, [fetchNearbyAndUpdate, latitude, longitude, station]);

  // 初回起動ダイアログ
  useEffect(() => {
    if (!storage.contains(STORAGE_KEYS.FIRST_LAUNCH_PASSED)) {
      showDialogWhilePresenting(
        STORAGE_KEYS.FIRST_LAUNCH_PASSED,
        translate('notice'),
        translate('firstAlertText'),
        [
          {
            text: 'OK',
            onPress: (): void => {
              storage.set(STORAGE_KEYS.FIRST_LAUNCH_PASSED, 'true');
            },
          },
        ]
      );
    }
  }, []);

  // 最寄り駅取得エラーのダイアログ
  useEffect(() => {
    if (nearbyStationFetchError) {
      console.error(nearbyStationFetchError);
      showDialogWhilePresenting(
        'initialNearbyStationFetchError',
        translate('errorTitle'),
        translate('apiErrorText')
      );
    }
  }, [nearbyStationFetchError]);

  const refetch = useCallback(async () => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    try {
      // refetch は常に新鮮な位置情報を取得する
      const currentLocation = await fetchCurrentLocation();
      if (!currentLocation) return;
      setLocation(currentLocation);
      await fetchNearbyAndUpdate({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      console.error(error);
    } finally {
      fetchInFlightRef.current = false;
    }
  }, [fetchCurrentLocation, fetchNearbyAndUpdate]);

  return { station, nearbyStationLoading, refetch };
};
