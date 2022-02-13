import auth from '@react-native-firebase/auth';
import database, {
  FirebaseDatabaseTypes,
} from '@react-native-firebase/database';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRecoilCallback, useRecoilValue } from 'recoil';
import { LOCATION_TASK_NAME, VISITOR_POLLING_INTERVAL } from '../constants';
import { LineDirection } from '../models/Bound';
import {
  APITrainType,
  APITrainTypeMinimum,
  Line,
  Station,
} from '../models/StationAPI';
import AppTheme from '../models/Theme';
import lineState from '../store/atoms/line';
import locationState from '../store/atoms/location';
import mirroringShareState from '../store/atoms/mirroringShare';
import navigationState from '../store/atoms/navigation';
import speechState from '../store/atoms/speech';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';

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
  theme: AppTheme;
};

type Visitor = {
  timestamp: number;
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
  const { rawStations, stations, selectedBound, selectedDirection } =
    useRecoilValue(stationState);
  const { trainType } = useRecoilValue(navigationState);
  const {
    token: rootToken,
    publishing: rootPublishing,
    startedAt,
  } = useRecoilValue(mirroringShareState);
  const { theme } = useRecoilValue(themeState);

  const dbRef = useRef<FirebaseDatabaseTypes.Reference>();

  const navigation = useNavigation();

  const getMyUID = useCallback(async () => {
    const {
      user: { uid },
    } = await auth().signInAnonymously();
    return uid;
  }, []);

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
        const uid = await getMyUID();

        set(mirroringShareState, (prev) => {
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
            token: prev.token || uid,
            startedAt: new Date(),
          };
        });
      },
    [destroyLocation, getMyUID]
  );

  const resetState = useRecoilCallback(
    ({ set }) =>
      () => {
        set(stationState, (prev) => ({
          ...prev,
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
        navigation.navigate('SelectLine');
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
          resetState();
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
          stations: publisherStations,
          selectedDirection: publisherSelectedDirection,
          rawStations: publisherRawStations = [],
          theme: publisherTheme,
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
        set(stationState, (prev) => ({
          ...prev,
          stations: publisherStations,
          rawStations: publisherRawStations,
          selectedDirection:
            publisherSelectedDirection || prev.selectedDirection,
          selectedBound: publisherSelectedBound || prev.selectedBound,
        }));
        set(navigationState, (prev) => ({
          ...prev,
          trainType: publisherTrainType,
        }));
        set(themeState, (prev) => ({
          ...prev,
          theme: publisherTheme,
        }));
      },
    [resetState]
  );

  const updateVisitorTimestamp = useCallback(
    async (
      db: FirebaseDatabaseTypes.Reference,
      publisherSnapshot: FirebaseDatabaseTypes.DataSnapshot
    ) => {
      const { visitedAt } = publisherSnapshot.val() || {
        visitedAt: database.ServerValue.TIMESTAMP,
      };
      db.set({
        visitedAt,
        timestamp: database.ServerValue.TIMESTAMP,
        inactive: false,
      });
    },
    []
  );

  const debouncedOnSnapshotValueChange = debounce(onSnapshotValueChange, 1000);

  const unsubscribe = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const { subscribing } = await snapshot.getPromise(mirroringShareState);
        if (!subscribing) {
          return;
        }

        if (dbRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          dbRef.current.off('value', debouncedOnSnapshotValueChange);
        }
        resetState();
        Alert.alert(
          translate('annoucementTitle'),
          translate('mirroringShareEnded')
        );
      },
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    [debouncedOnSnapshotValueChange, resetState, dbRef]
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

        const visitors = data.val() as { [key: string]: Visitor };
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
        const { publishing } = await snapshot.getPromise(mirroringShareState);

        if (publishing) {
          throw new Error(translate('subscribeProhibitedError'));
        }

        await auth().signInAnonymously();

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

        set(mirroringShareState, (prev) => ({
          ...prev,
          subscribing: true,
          token: publisherToken,
        }));

        const myUID = await getMyUID();

        const myDBRef = database().ref(
          `/mirroringShare/visitors/${publisherToken}/${myUID}`
        );

        updateVisitorTimestamp(myDBRef, publisherDataSnapshot);
        setInterval(
          () => updateVisitorTimestamp(myDBRef, publisherDataSnapshot),
          1000 * 60,
          VISITOR_POLLING_INTERVAL
        );

        newDbRef.on('value', debouncedOnSnapshotValueChange);

        if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
      },
    [getMyUID, debouncedOnSnapshotValueChange, updateVisitorTimestamp]
  );

  const publishAsync = useCallback(async () => {
    try {
      await dbRef.current?.set({
        latitude: location?.coords.latitude,
        longitude: location?.coords.longitude,
        accuracy: location?.coords.accuracy,
        selectedLine,
        selectedBound,
        selectedDirection,
        trainType,
        stations,
        rawStations,
        theme,
        timestamp: database.ServerValue.TIMESTAMP,
      } as StorePayload);
    } catch (err) {
      Alert.alert(
        translate('errorTitle'),
        (err as { message: string }).message
      );
    }
  }, [
    location?.coords.accuracy,
    location?.coords.latitude,
    location?.coords.longitude,
    rawStations,
    selectedBound,
    selectedDirection,
    selectedLine,
    stations,
    theme,
    trainType,
  ]);

  useEffect(() => {
    if (rootPublishing && rootToken) {
      dbRef.current = database().ref(`/mirroringShare/sessions/${rootToken}`);
    }
  }, [rootPublishing, rootToken]);

  useEffect(() => {
    if (rootPublishing && rootToken) {
      publishAsync();
    }
  }, [publishAsync, rootPublishing, rootToken]);

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
