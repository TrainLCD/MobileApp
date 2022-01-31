import auth from '@react-native-firebase/auth';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { nanoid } from 'nanoid';
import { useEffect, useState } from 'react';
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
  const [snapshotSubscription, setSnapshotSubscription] =
    useState<() => void>();
  const { subscribed, publishing } = useRecoilValue(mirroringShareState);
  const { location } = useRecoilValue(locationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { rawStations, stations, selectedBound, selectedDirection } =
    useRecoilValue(stationState);
  const { trainType, leftStations } = useRecoilValue(navigationState);
  const navigation = useNavigation();

  const destroyLocation = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const { token } = await snapshot.getPromise(mirroringShareState);
        if (token) {
          await firestore().collection('mirroringShare').doc(token).delete();
        }
      },
    []
  );

  const togglePublishing = useRecoilCallback(
    ({ set }) =>
      async () => {
        await auth().signInAnonymously();
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
            token: prev.token || nanoid(),
          };
        });
      },
    [destroyLocation]
  );

  const subscribe = useRecoilCallback(
    ({ set }) =>
      async (publisherToken: string) => {
        const { currentUser } = auth();
        if (!currentUser) {
          await auth().signInAnonymously();
        }

        const publisherDataSnapshot = await firestore()
          .collection('mirroringShare')
          .doc(publisherToken)
          .get();

        if (!publisherDataSnapshot.exists) {
          throw new Error(translate('publisherNotFound'));
        }

        const dat = publisherDataSnapshot.data() as StorePayload | undefined;

        if (!dat?.selectedBound || !dat?.selectedLine) {
          throw new Error(translate('publisherNotReady'));
        }

        set(mirroringShareState, (prev) => ({
          ...prev,
          subscribed: true,
          token: publisherToken,
        }));
      },
    []
  );
  const unsubscribe = useRecoilCallback(
    ({ set }) =>
      () => {
        if (snapshotSubscription) {
          snapshotSubscription();
        }
        set(mirroringShareState, (prev) => ({
          ...prev,
          subscribed: false,
          token: null,
        }));
      },
    [snapshotSubscription]
  );

  const processSnapshot = useRecoilCallback(
    ({ set }) =>
      async (
        s: FirebaseFirestoreTypes.DocumentSnapshot<FirebaseFirestoreTypes.DocumentData>
      ) => {
        // 多分ミラーリングシェアが終了されてる
        if (!s.exists) {
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
            subscribed: false,
          }));
          navigation.navigate('SelectLine');
          Alert.alert(translate('notice'), translate('mirroringShareEnded'));
          unsubscribe();
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
          leftStations: publisherLeftStations,
          rawStations: publisherRawStations,
          theme: publisherTheme,
        } = s.data() as StorePayload;

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
    [navigation, unsubscribe]
  );

  const updateAsync = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const { token } = await snapshot.getPromise(mirroringShareState);

        if (subscribed && token) {
          const firstSnapshot = await firestore()
            .collection('mirroringShare')
            .doc(token)
            .get();
          await processSnapshot(firstSnapshot);

          const subscription = firestore()
            .collection('mirroringShare')
            .doc(token)
            .onSnapshot(processSnapshot);
          setSnapshotSubscription(subscription);
        }
      },
    [processSnapshot, subscribed]
  );

  useEffect(() => {
    updateAsync();
    // return () => {
    //   if (snapshotSubscription) {
    //     snapshotSubscription();
    //   }
    // };
  }, [updateAsync]);

  const startSharingAsync = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const { token } = await snapshot.getPromise(mirroringShareState);
        const { theme } = await snapshot.getPromise(themeState);
        if (!publishing || !token) {
          return;
        }
        try {
          await firestore()
            .collection('mirroringShare')
            .doc(token)
            .set({
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
      publishing,
      rawStations,
      selectedBound,
      selectedDirection,
      selectedLine,
      stations,
      trainType,
    ]
  );

  useEffect(() => {
    startSharingAsync();
  }, [startSharingAsync]);

  return {
    togglePublishing,
    subscribe,
    unsubscribe,
  };
};

export default useMirroringShare;
