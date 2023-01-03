import database, {
  FirebaseDatabaseTypes,
} from '@react-native-firebase/database';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRecoilCallback, useRecoilValue } from 'recoil';
import { LOCATION_TASK_NAME } from '../constants/location';
import { LineDirection } from '../models/Bound';
import {
  APITrainType,
  APITrainTypeMinimum,
  Line,
  Station,
} from '../models/StationAPI';
import authState from '../store/atoms/auth';
import lineState from '../store/atoms/line';
import locationState from '../store/atoms/location';
import mirroringShareState from '../store/atoms/mirroringShare';
import navigationState from '../store/atoms/navigation';
import recordRouteState from '../store/atoms/record';
import speechState from '../store/atoms/speech';
import stationState, { initialStationState } from '../store/atoms/station';
import { translate } from '../translation';
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
  initialStation: Station;
};

type VisitorPayload = {
  // ライブラリ側でobject型を使っているのでLintを無視する
  // eslint-disable-next-line @typescript-eslint/ban-types
  timestamp: object;
  inactive: boolean;
};

const useMirroringShare = (
  publisher = false
): {
  togglePublishing: () => void;
  subscribe: (publisherToken: string) => Promise<void>;
  unsubscribe: () => void;
} => {
  const { location: myLocation } = useRecoilValue(locationState);
  const { selectedLine: mySelectedLine } = useRecoilValue(lineState);
  const {
    selectedBound: mySelectedBound,
    selectedDirection: mySelectedDirection,
    station: myStation,
    stations: myStations,
  } = useRecoilValue(stationState);
  const { trainType: myTrainType } = useRecoilValue(navigationState);
  const {
    token: rootToken,
    publishing: rootPublishing,
    publishStartedAt,
  } = useRecoilValue(mirroringShareState);
  const { user } = useRecoilValue(authState);

  const dbRef = useRef<FirebaseDatabaseTypes.Reference>();

  const navigation = useNavigation();
  const isInternetAvailable = useConnectivity();

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
          if (!user) {
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
            token: prev.token || user.uid,
            publishStartedAt: new Date(),
          };
        });
      },
    [user, destroyLocation]
  );

  const resetState = useRecoilCallback(
    ({ reset, set }) =>
      (sessionEnded?: boolean) => {
        set(stationState, (prev) => ({
          ...initialStationState,
          station: prev.station,
        }));
        reset(speechState);
        reset(lineState);
        reset(mirroringShareState);
        reset(recordRouteState);

        if (sessionEnded) {
          navigation.navigate('SelectLine');
        }
      },
    [navigation]
  );

  const updateVisitorTimestamp = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const { token } = await snapshot.getPromise(mirroringShareState);
        if (!user || !token) {
          return;
        }
        const db = database().ref(
          `/mirroringShare/visitors/${token}/${user.uid}`
        );

        updateDB(
          {
            timestamp: database.ServerValue.TIMESTAMP,
            inactive: false,
          },
          db
        );
      },
    [user, updateDB]
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
          latitude: publisherLatitude,
          longitude: publisherLongitude,
          accuracy: publisherAccuracy,
          selectedLine: publisherSelectedLine,
          selectedBound: publisherSelectedBound,
          trainType: publisherTrainType,
          stations: publisherStations = [],
          selectedDirection: publisherSelectedDirection,
          initialStation: publisherInitialStation,
        } = data.val() as StorePayload;

        set(locationState, (prev) => {
          if (
            prev.location?.coords.latitude === publisherLatitude &&
            prev.location.coords.longitude === publisherLongitude
          ) {
            return prev;
          }
          return {
            ...prev,
            location: {
              coords: {
                latitude: publisherLatitude,
                longitude: publisherLongitude,
                accuracy: publisherAccuracy,
              },
            },
          };
        });

        set(lineState, (prev) => ({
          ...prev,
          selectedLine: publisherSelectedLine,
        }));

        set(stationState, (prev) => {
          if (
            prev.stations[0] &&
            prev.stations[0].id === publisherStations[0]?.id
          ) {
            return prev;
          }
          return {
            ...prev,
            stations: publisherStations,
            selectedBound: publisherSelectedBound,
            selectedDirection: publisherSelectedDirection,
            station: publisherInitialStation,
          };
        });

        set(navigationState, (prev) => {
          if (prev.trainType?.id === publisherTrainType?.id) {
            return prev;
          }
          return {
            ...prev,
            trainType: publisherTrainType,
          };
        });

        // 受信できたことを報告する
        await updateVisitorTimestamp();
      },
    [resetState, updateVisitorTimestamp]
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
    [resetState]
  );

  const onVisitorChange = useRecoilCallback(
    ({ set }) =>
      async (data: FirebaseDatabaseTypes.DataSnapshot) => {
        if (!data.exists()) {
          set(mirroringShareState, (prev) => ({
            ...prev,
            activeVisitors: 0,
          }));
          return;
        }

        const visitors = data.val() as { [key: string]: VisitorPayload };
        const total = Object.keys(visitors).filter((key) => {
          // 過去の配信の購読者なのでデータを消す
          if (
            publishStartedAt &&
            (visitors[key].timestamp as unknown as number) <
              publishStartedAt?.getTime()
          ) {
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
    [publishStartedAt, rootToken]
  );

  const onSnapshotValueChangeListener = useCallback(
    async (d: FirebaseDatabaseTypes.DataSnapshot) => {
      try {
        await onSnapshotValueChange(d);
      } catch (err) {
        await unsubscribe();
      }
    },
    [onSnapshotValueChange, unsubscribe]
  );

  const subscribe = useRecoilCallback(
    ({ set, snapshot }) =>
      async (publisherToken: string) => {
        const { publishing, subscribing } = await snapshot.getPromise(
          mirroringShareState
        );

        if (publishing) {
          throw new Error(translate('subscribeProhibitedError'));
        }

        const newDbRef = database().ref(
          `/mirroringShare/sessions/${publisherToken}`
        );
        dbRef.current = newDbRef;

        const publisherDataSnapshot = await newDbRef.once('value');
        if (!publisherDataSnapshot.exists() && !subscribing) {
          throw new Error(translate('publisherNotFound'));
        }

        const data = publisherDataSnapshot.val() as StorePayload | undefined;
        if (!data?.selectedBound || !data?.selectedLine) {
          throw new Error(translate('publisherNotReady'));
        }

        set(mirroringShareState, (prev) => ({
          ...prev,
          subscribing: true,
          token: publisherToken,
        }));

        newDbRef.on('value', onSnapshotValueChangeListener);

        Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      },
    [onSnapshotValueChangeListener]
  );

  const publishAsync = useCallback(async () => {
    try {
      await updateDB({
        latitude: myLocation?.coords.latitude,
        longitude: myLocation?.coords.longitude,
        accuracy: myLocation?.coords.accuracy,
        selectedLine: mySelectedLine,
        selectedBound: mySelectedBound,
        selectedDirection: mySelectedDirection,
        trainType: myTrainType,
        stations: myStations,
        initialStation: myStation,
        timestamp: database.ServerValue.TIMESTAMP,
      } as StorePayload);
    } catch (err) {
      Alert.alert(
        translate('errorTitle'),
        (err as { message: string }).message
      );
    }
  }, [
    myLocation?.coords.accuracy,
    myLocation?.coords.latitude,
    myLocation?.coords.longitude,
    myStations,
    mySelectedBound,
    mySelectedDirection,
    mySelectedLine,
    myStation,
    myTrainType,
    updateDB,
  ]);

  useEffect(() => {
    if (publisher && rootPublishing && rootToken && !dbRef.current) {
      dbRef.current = database().ref(`/mirroringShare/sessions/${rootToken}`);
    }
  }, [publisher, rootPublishing, rootToken]);

  useEffect(() => {
    if (publisher && rootPublishing) {
      publishAsync();
    }
  }, [publishAsync, publisher, rootPublishing]);

  const subscribeVisitorsAsync = useCallback(async () => {
    if (publisher && rootPublishing && rootToken) {
      const ref = database().ref(`/mirroringShare/visitors/${rootToken}`);
      ref.on('value', onVisitorChange);
      return () => {
        ref.off('value', onVisitorChange);
      };
    }
    return () => undefined;
  }, [onVisitorChange, publisher, rootPublishing, rootToken]);

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
