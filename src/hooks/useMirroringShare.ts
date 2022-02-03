import auth from '@react-native-firebase/auth';
import database, {
  FirebaseDatabaseTypes,
} from '@react-native-firebase/database';
import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRecoilCallback, useRecoilValue } from 'recoil';
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
  const dbRef = useRef<FirebaseDatabaseTypes.Reference>();

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
        const {
          user: { uid },
        } = await auth().signInAnonymously();

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
          };
        });
      },
    [destroyLocation]
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
          rawStations: publisherRawStations,
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

  const subscribe = useRecoilCallback(
    ({ set, snapshot }) =>
      async (publisherToken: string) => {
        const { publishing } = await snapshot.getPromise(mirroringShareState);

        if (publishing) {
          throw new Error(translate('subscribeProhibitedError'));
        }

        await auth().signInAnonymously();

        dbRef.current = database().ref(`/mirroringShare/${publisherToken}`);

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

        database()
          .ref(`/mirroringShare/${publisherToken}`)
          .on('value', onSnapshotValueChange);
      },
    [onSnapshotValueChange]
  );

  const publishAsync = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const { theme } = await snapshot.getPromise(themeState);
        const { publishing, token } = await snapshot.getPromise(
          mirroringShareState
        );
        if (!publishing || !token) {
          return;
        }

        dbRef.current = database().ref(`/mirroringShare/${token}`);

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

  return {
    togglePublishing,
    subscribe,
    unsubscribe,
  };
};

export default useMirroringShare;
