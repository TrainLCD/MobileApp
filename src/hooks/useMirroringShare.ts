import auth from '@react-native-firebase/auth';
import database, {
  FirebaseDatabaseTypes,
} from '@react-native-firebase/database';
import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRecoilCallback, useRecoilValue } from 'recoil';
import { VISITOR_POLLING_INTERVAL } from '../constants';
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
  leftStations: Station[];
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
  const { trainType, leftStations } = useRecoilValue(navigationState);
  const {
    token: rootToken,
    publishing: rootPublishing,
    startedAt,
  } = useRecoilValue(mirroringShareState);
  const dbRef = useRef<FirebaseDatabaseTypes.Reference>();

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
    []
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
      },
    []
  );

  const onSnapshotValueChange: (
    data: FirebaseDatabaseTypes.DataSnapshot
  ) => Promise<void> = useRecoilCallback(
    ({ set }) =>
      async (data: FirebaseDatabaseTypes.DataSnapshot) => {
        // 多分ミラーリングシェアが終了されてる
        if (!data.exists) {
          resetState();
          Alert.alert(translate('notice'), translate('mirroringShareEnded'));
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
          leftStations: publisherLeftStations = [],
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
          leftStations: publisherLeftStations,
        }));
        set(themeState, (prev) => ({
          ...prev,
          theme: publisherTheme,
        }));
      },
    [resetState]
  );

  const updateVisitorTimestamp = useCallback(
    async (publisherToken: string) => {
      const myUID = await getMyUID();

      const myRef = database().ref(
        `/mirroringShare/visitors/${publisherToken}/${myUID}`
      );
      const currentDataRef = await myRef.once('value');
      const { visitedAt } = currentDataRef.val() || {
        visitedAt: database.ServerValue.TIMESTAMP,
      };
      myRef.set({
        visitedAt,
        timestamp: database.ServerValue.TIMESTAMP,
        inactive: false,
      });
    },
    [getMyUID]
  );

  const unsubscribe = useCallback(
    () => {
      if (dbRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        dbRef.current.off('value', onSnapshotValueChange);
        resetState();
        Alert.alert(translate('notice'), translate('mirroringShareEnded'));
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    [onSnapshotValueChange, resetState]
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

        dbRef.current = database().ref(
          `/mirroringShare/sessions/${publisherToken}`
        );

        const publisherDataSnapshot = await dbRef.current.once('value');

        if (!publisherDataSnapshot.exists) {
          throw new Error(translate('publisherNotFound'));
        }

        const dat = publisherDataSnapshot.val() as StorePayload | undefined;

        if (!dat?.selectedBound || !dat?.selectedLine) {
          throw new Error(translate('publisherNotReady'));
        }

        set(mirroringShareState, (prev) => ({
          ...prev,
          subscribing: true,
          token: publisherToken,
        }));

        await updateVisitorTimestamp(publisherToken);
        setInterval(
          () => updateVisitorTimestamp(publisherToken),
          1000 * 60,
          VISITOR_POLLING_INTERVAL
        );

        const ref = database().ref(
          `/mirroringShare/sessions/${publisherToken}`
        );
        ref.on('value', onSnapshotValueChange);
      },
    [onSnapshotValueChange, updateVisitorTimestamp]
  );

  const publishAsync = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const { theme } = await snapshot.getPromise(themeState);
        if (!rootPublishing || !rootToken) {
          return;
        }

        dbRef.current = database().ref(`/mirroringShare/sessions/${rootToken}`);

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
            leftStations,
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
      },
    [
      leftStations,
      location?.coords.accuracy,
      location?.coords.latitude,
      location?.coords.longitude,
      rawStations,
      rootPublishing,
      rootToken,
      selectedBound,
      selectedDirection,
      selectedLine,
      stations,
      trainType,
    ]
  );

  useEffect(() => {
    publishAsync();
  }, [publishAsync]);

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
