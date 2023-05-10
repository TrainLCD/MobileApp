import { LocationObject } from 'expo-location';
import { useCallback, useState } from 'react';
import { useSetRecoilState } from 'recoil';
import { GetStationByCoordinatesRequest } from '../gen/stationapi_pb';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import grpcClient from '../utils/grpc';

type PickedLocation = Pick<LocationObject, 'coords'>;

const useFetchNearbyStation = (): [
  (location: PickedLocation) => Promise<void>,
  boolean,
  Error | undefined
] => {
  const setStation = useSetRecoilState(stationState);
  const setNavigation = useSetRecoilState(navigationState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const fetchStation = useCallback(
    async (location: PickedLocation | undefined) => {
      if (!location?.coords) {
        return;
      }

      const { latitude, longitude } = location.coords;

      try {
        setLoading(true);

        const req = new GetStationByCoordinatesRequest();
        req.setLatitude(latitude);
        req.setLongitude(longitude);
        const resp = (
          await grpcClient.getStationByCoordinates(req, {})
        ).toObject();

        if (resp.stationsList.length !== 0) {
          setStation((prev) => ({
            ...prev,
            station: resp.stationsList[0],
          }));
          setNavigation((prev) => ({
            ...prev,
            stationForHeader: resp.stationsList[0],
          }));
        }
      } catch (err) {
        console.error(err);
        setError(err as Error);
      }
      setLoading(false);
    },
    [setNavigation, setStation]
  );

  return [fetchStation, loading, error];
};

export default useFetchNearbyStation;
