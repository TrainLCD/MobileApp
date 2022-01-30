import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useState } from 'react';
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
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import { translate } from '../translation';

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
  startSubscribe: (publisherToken: string) => Promise<void>;
  stopSubscribe: () => void;
} => {
  const [snapshotSubscription, setSnapshotSubscription] =
    useState<() => void>();
  const { subscribed, token, publishing } = useRecoilValue(mirroringShareState);

  const destroyLocation = useCallback(async () => {
    if (token) {
      await firestore().collection('mirroringShare').doc(token).delete();
    }
  }, [token]);

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

  const startSubscribe = useRecoilCallback(
    ({ set }) =>
      async (publisherToken: string) => {
        await auth().signInAnonymously();

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
  const stopSubscribe = useRecoilCallback(
    ({ set }) =>
      () =>
        set(mirroringShareState, (prev) => ({
          ...prev,
          subscribed: false,
          token: null,
        })),
    []
  );

  const updateAsync = useRecoilCallback(
    ({ set }) =>
      async () => {
        if (subscribed && token) {
          const subscription = firestore()
            .collection('mirroringShare')
            .doc(token)
            .onSnapshot((s) => {
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
              set(mirroringShareState, (prev) => ({
                ...prev,
                subscribed: false,
                token: null,
              }));
              set(themeState, (prev) => ({
                ...prev,
                theme: publisherTheme,
              }));
            });
          setSnapshotSubscription(subscription);
        }
      },
    [subscribed, token]
  );

  useEffect(() => {
    updateAsync();
    return () => {
      if (snapshotSubscription) {
        snapshotSubscription();
      }
    };
  }, [snapshotSubscription, updateAsync]);

  const startSharingAsync = useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const { location } = await snapshot.getPromise(locationState);
        const { selectedLine } = await snapshot.getPromise(lineState);
        const { selectedBound, selectedDirection, stations, rawStations } =
          await snapshot.getPromise(stationState);
        const { trainType, leftStations } = await snapshot.getPromise(
          navigationState
        );
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
    [publishing, token]
  );

  useEffect(() => {
    startSharingAsync();
  }, [startSharingAsync]);

  return {
    togglePublishing,
    startSubscribe,
    stopSubscribe,
  };
};

export default useMirroringShare;
