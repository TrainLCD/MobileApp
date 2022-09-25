import database, {
  FirebaseDatabaseTypes,
} from '@react-native-firebase/database';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, InteractionManager } from 'react-native';
import { useRecoilCallback, useRecoilValue } from 'recoil';
import { LOCATION_TASK_NAME } from '../constants/location';
import { LineDirection } from '../models/Bound';
import {
  APITrainType,
  APITrainTypeMinimum,
  Line,
  Station,
} from '../models/StationAPI';
import lineState from '../store/atoms/line';
import locationState from '../store/atoms/location';
import mirroringShareState from '../store/atoms/mirroringShare';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import useAnonymousUser from './useAnonymousUser';
import useConnectivity from './useConnectivity';

type StorePayload = {
  latitude: number;
  longitude: number;
  accuracy: number;
  selectedLine: Line;
  selectedBound: Station;
  trainType: APITrainType | APITrainTypeMinimum | null | undefined;
  selectedDirection: LineDirection;
  stations: Station[];
  rawStations: Station[];
  initialStation: Station;
};

type VisitorPayload = {
  // ライブラリ側でobject型を使っているのでLintを無視する
  // eslint-disable-next-line @typescript-eslint/ban-types
  timestamp: number | object;
  visitedAt: number;
  inactive: boolean;
};

const useMirroringShare = (): {
  togglePublishing: () => void;
  subscribe: (publisherToken: string) => Promise<void>;
  unsubscribe: () => void;
} => {
  const { location } = useRecoilValue(locationState);
  const { selectedLine } = useRecoilValue(lineState);
  const {
    rawStations,
    stations,
    selectedBound,
    selectedDirection,
    station: initialStation,
  } = useRecoilValue(stationState);
  const { trainType } = useRecoilValue(navigationState);
  const {
    token: rootToken,
    publishing: rootPublishing,
    startedAt,
  } = useRecoilValue(mirroringShareState);
  const dbRef = useRef<FirebaseDatabaseTypes.Reference>();

  const navigation = useNavigation();
  const isInternetAvailable = useConnectivity();
  const anonUser = useAnonymousUser();

  const updateDB = useCallback(
    async (
      payload: Partial<StorePayload> | Partial<VisitorPayload>,
      customDB?: FirebaseDatabaseTypes.Reference
    ) => {
      if (!isInternetAvailable) {
        return;
      }

      if (customDB) {
        await customDB.update(payload);
        return;
      }
      await dbRef.current?.update(payload);
    },
    [isInternetAvailable]
  );

  const destroyLocation = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const { token } = await snapshot.getPromise(mirroringShareState);
        if (token) {
          await dbRef.current?.remove();
        }
      },
    [dbRef]
  );

  const togglePublishing = useRecoilCallback(
    ({ set }) =>
      async () => {
        set(mirroringShareState, (prev) => {
          if (!anonUser) {
            return {
              ...prev,
              publishing: false,
            };
          }

          if (prev.publishing) {
            destroyLocation();

            return {
              ...prev,
              publishing: false,
            };
          }
          return {
            ...prev,
            publishing: true,
            token: prev.token || anonUser.uid,
            startedAt: new Date(),
          };
        });
      },
    [anonUser, destroyLocation]
  );

  const resetState = useRecoilCallback(
    ({ set }) =>
      (sessionEnded?: boolean) => {
        set(stationState, (prev) => ({
          ...prev,
          station: null,
          selectedDirection: null,
          selectedBound: null,
          stations: [],
          rawStations: [],
        }));
        set(speechState, (prev) => ({
          ...prev,
          muted: true,
        }));
        set(lineState, (prev) => ({
          ...prev,
          selectedLine: null,
        }));
        set(navigationState, (prev) => ({
          ...prev,
          headerState: isJapanese
            ? ('CURRENT' as const)
            : ('CURRENT_EN' as const),
          trainType: null,
          bottomState: 'LINE' as const,
          leftStations: [],
          stationForHeader: null,
        }));
        set(mirroringShareState, (prev) => ({
          ...prev,
          subscribing: false,
          token: null,
          startedAt: null,
          activeVisitors: 0,
          totalVisitors: 0,
        }));

        if (sessionEnded) {
          navigation.navigate('SelectLine');
        }
      },
    [navigation]
  );

  const onSnapshotValueChange: (
    data: FirebaseDatabaseTypes.DataSnapshot
  ) => Promise<void> = useRecoilCallback(
    ({ set }) =>
      async (data: FirebaseDatabaseTypes.DataSnapshot) => {
        // 多分ミラーリングシェアが終了されてる
        if (!data.exists()) {
          if (dbRef.current) {
            dbRef.current.off('value');
          }
          resetState(true);
          Alert.alert(
            translate('annoucementTitle'),
            translate('mirroringShareEnded')
          );
          return;
        }

        const {
          latitude,
          longitude,
          accuracy,
          selectedLine: publisherSelectedLine,
          selectedBound: publisherSelectedBound,
          trainType: publisherTrainType,
          stations: publisherStations = [],
          selectedDirection: publisherSelectedDirection,
          rawStations: publisherRawStations = [],
          initialStation: publisherInitialStation,
        } = data.val() as StorePayload;

        set(locationState, (prev) => ({
          ...prev,
          location: {
            coords: {
              latitude,
              longitude,
              accuracy,
            },
          },
        }));
        set(lineState, (prev) => ({
          ...prev,
          selectedLine: publisherSelectedLine || prev.selectedLine,
        }));
        if (!initialStation) {
          set(stationState, (prev) => ({
            ...prev,
            station: publisherInitialStation,
          }));
        }
        if (!selectedDirection) {
          set(stationState, (prev) => ({
            ...prev,
            selectedDirection: publisherSelectedDirection,
          }));
        }
        if (!selectedBound) {
          set(stationState, (prev) => ({
            ...prev,
            selectedBound: publisherSelectedBound,
          }));
        }

        set(stationState, (prev) => ({
          ...prev,
          stations: publisherStations,
          rawStations: publisherRawStations,
        }));
        set(navigationState, (prev) => ({
          ...prev,
          trainType: publisherTrainType,
        }));
      },
    [initialStation, resetState, selectedBound, selectedDirection]
  );

  const updateVisitorTimestamp = useCallback(
    async (
      db: FirebaseDatabaseTypes.Reference,
      publisherSnapshot: FirebaseDatabaseTypes.DataSnapshot
    ) => {
      const { visitedAt } = publisherSnapshot.val() || {
        visitedAt: database.ServerValue.TIMESTAMP,
      };
      updateDB(
        {
          visitedAt,
          timestamp: database.ServerValue.TIMESTAMP,
          inactive: false,
        },
        db
      );
    },
    [updateDB]
  );

  const unsubscribe = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const { subscribing } = await snapshot.getPromise(mirroringShareState);
        if (!subscribing) {
          return;
        }

        if (dbRef.current) {
          dbRef.current.off('value');
        }
        resetState(true);
        Alert.alert(
          translate('annoucementTitle'),
          translate('mirroringShareEnded')
        );
      },
    [resetState, dbRef]
  );

  const onVisitorChange = useRecoilCallback(
    ({ set }) =>
      async (data: FirebaseDatabaseTypes.DataSnapshot) => {
        if (!startedAt || !data.exists()) {
          set(mirroringShareState, (prev) => ({
            ...prev,
            activeVisitors: 0,
          }));
          return;
        }

        const visitors = data.val() as { [key: string]: VisitorPayload };
        const total = Object.keys(visitors).filter((key) => {
          // 過去の配信の購読者なのでデータを消す
          if (visitors[key].timestamp < startedAt?.getTime()) {
            database()
              .ref(`/mirroringShare/visitors/${rootToken}/${key}`)
              .remove();
            return false;
          }
          return true;
        });
        const active = Object.keys(visitors).filter(
          (key) => !visitors[key].inactive
        );
        set(mirroringShareState, (prev) => ({
          ...prev,
          totalVisitors: total.length,
          activeVisitors: active.length,
        }));
      },
    [rootToken, startedAt]
  );

  const subscribe = useRecoilCallback(
    ({ set, snapshot }) =>
      async (publisherToken: string) => {
        if (!anonUser) {
          return;
        }

        const { publishing } = await snapshot.getPromise(mirroringShareState);

        if (publishing) {
          throw new Error(translate('subscribeProhibitedError'));
        }

        const newDbRef = database().ref(
          `/mirroringShare/sessions/${publisherToken}`
        );
        dbRef.current = newDbRef;

        const publisherDataSnapshot = await newDbRef.once('value');
        if (!publisherDataSnapshot.exists()) {
          throw new Error(translate('publisherNotFound'));
        }

        const data = publisherDataSnapshot.val() as StorePayload | undefined;
        if (!data?.selectedBound || !data?.selectedLine) {
          throw new Error(translate('publisherNotReady'));
        }

        resetState();

        set(mirroringShareState, (prev) => ({
          ...prev,
          subscribing: true,
          token: publisherToken,
        }));

        const myDBRef = database().ref(
          `/mirroringShare/visitors/${publisherToken}/${anonUser.uid}`
        );

        const onSnapshotValueChangeAdapter = (
          d: FirebaseDatabaseTypes.DataSnapshot
        ) =>
          InteractionManager.runAfterInteractions(async () => {
            await onSnapshotValueChange(d);
            await updateVisitorTimestamp(myDBRef, publisherDataSnapshot);
          });

        newDbRef.on('value', onSnapshotValueChangeAdapter);

        if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
      },
    [anonUser, onSnapshotValueChange, resetState, updateVisitorTimestamp]
  );

  const publishAsync = useCallback(async () => {
    try {
      await updateDB({
        latitude: location?.coords.latitude,
        longitude: location?.coords.longitude,
        accuracy: location?.coords.accuracy,
        selectedLine,
        selectedBound,
        selectedDirection,
        trainType,
        stations,
        rawStations,
        initialStation,
        timestamp: database.ServerValue.TIMESTAMP,
      } as StorePayload);
    } catch (err) {
      Alert.alert(
        translate('errorTitle'),
        (err as { message: string }).message
      );
    }
  }, [
    initialStation,
    rawStations,
    selectedBound,
    selectedDirection,
    selectedLine,
    stations,
    location?.coords.accuracy,
    location?.coords.latitude,
    location?.coords.longitude,
    trainType,
    updateDB,
  ]);

  useEffect(() => {
    if (rootPublishing && rootToken) {
      dbRef.current = database().ref(`/mirroringShare/sessions/${rootToken}`);
    }
  }, [rootPublishing, rootToken]);

  useEffect(() => {
    if (rootPublishing) {
      publishAsync();
    }
  }, [publishAsync, rootPublishing]);

  const subscribeVisitorsAsync = useCallback(async () => {
    if (rootPublishing && rootToken) {
      const ref = database().ref(`/mirroringShare/visitors/${rootToken}`);
      ref.on('value', onVisitorChange);
      return () => {
        ref.off('value', onVisitorChange);
      };
    }
    return () => undefined;
  }, [onVisitorChange, rootPublishing, rootToken]);
  useEffect(() => {
    subscribeVisitorsAsync();
  }, [subscribeVisitorsAsync]);

  return {
    togglePublishing,
    subscribe,
    unsubscribe,
  };
};

export default useMirroringShare;
