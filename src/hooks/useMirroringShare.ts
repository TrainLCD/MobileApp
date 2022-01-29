import firestore from '@react-native-firebase/firestore';
import { nanoid } from 'nanoid';
import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRecoilState } from 'recoil';
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
import stationState from '../store/atoms/station';
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
};

const useMirroringShare = (): {
  togglePublishing: () => void;
  publishing: boolean;
  token: string | null;
  startSubscribe: (publisherToken: string) => Promise<void>;
  stopSubscribe: () => void;
} => {
  const [{ publishing, token, subscribed }, setMsState] =
    useRecoilState(mirroringShareState);
  const [{ location }, setLocationState] = useRecoilState(locationState);
  const [{ selectedDirection, selectedBound, stations }, setStationState] =
    useRecoilState(stationState);
  const [{ selectedLine }, setLineState] = useRecoilState(lineState);
  const [{ trainType }, setNavigationState] = useRecoilState(navigationState);

  const destroyLocation = useCallback(async () => {
    if (token) {
      await firestore().collection('mirroringShare').doc(token).delete();
    }
  }, [token]);

  const togglePublishing = useCallback(() => {
    setMsState((prev) => {
      if (prev.publishing) {
        destroyLocation();

        return {
          ...prev,
          publishing: false,
          token: null,
        };
      }
      return {
        ...prev,
        publishing: true,
        token: nanoid(),
      };
    });
  }, [destroyLocation, setMsState]);

  const startSubscribe = useCallback(
    async (publisherToken: string) => {
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

      setMsState((prev) => ({
        ...prev,
        subscribed: true,
        token: publisherToken,
      }));
    },
    [setMsState]
  );
  const stopSubscribe = useCallback(
    () => setMsState((prev) => ({ ...prev, subscribed: false, token: null })),
    [setMsState]
  );

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    if (subscribed && token) {
      unsubscribe = firestore()
        .collection('mirroringShare')
        .doc(token)
        .onSnapshot((snapshot) => {
          const {
            latitude,
            longitude,
            accuracy,
            selectedLine: publisherSelectedLine,
            selectedBound: publisherSelectedBound,
            trainType: publisherTrainType,
            stations: publisherStations,
            selectedDirection: publisherSelectedDirection,
          } = snapshot.data() as StorePayload;
          setLocationState((prev) => ({
            ...prev,
            location: {
              coords: {
                latitude,
                longitude,
                accuracy,
              },
            },
          }));
          setLineState((prev) => ({
            ...prev,
            selectedLine: publisherSelectedLine || prev.selectedLine,
          }));
          setStationState((prev) => ({
            ...prev,
            stations: publisherStations,
            selectedDirection:
              publisherSelectedDirection || prev.selectedDirection,
            selectedBound: publisherSelectedBound || prev.selectedBound,
          }));
          setNavigationState((prev) => ({
            ...prev,
            trainType: publisherTrainType,
          }));
        });
    }
    if (!subscribed && unsubscribe) {
      unsubscribe();
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    setLineState,
    setLocationState,
    setNavigationState,
    setStationState,
    subscribed,
    token,
  ]);

  useEffect(() => {
    const startMSAsync = async () => {
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
          } as StorePayload);
      } catch (err) {
        Alert.alert(
          translate('errorTitle'),
          (err as { message: string }).message
        );
      }
    };
    startMSAsync();
  }, [
    location?.coords.accuracy,
    location?.coords.latitude,
    location?.coords.longitude,
    publishing,
    selectedBound,
    selectedDirection,
    selectedLine,
    stations,
    token,
    trainType,
  ]);

  return {
    togglePublishing,
    publishing,
    token,
    startSubscribe,
    stopSubscribe,
  };
};

export default useMirroringShare;
